import { Agent, ServiceDef, PricingDef } from '../types';
import { generateAgentWallet, generateId } from '../utils/blockchain';
import { spawn } from 'child_process';
import * as path from 'path';
import { getSQL } from './DatabaseService';

// In-memory cache (backed by database)
const agentCache: Map<string, Agent> = new Map();
// Store private keys in memory (agents keep their own keys in production)
const agentKeys: Map<string, string> = new Map();
let cacheLoaded = false;

// Agent registration result includes privateKey for the agent to keep
export interface AgentRegistrationResult {
    agent: Agent;
    privateKey: string;
}

// Service execution result
export interface ExecutionResult {
    success: boolean;
    output: unknown;
    cost: number;
    duration: number;
}

export class AgentService {
    // Load agents from database into cache
    private static async loadCache(): Promise<void> {
        if (cacheLoaded) return;

        const sql = getSQL();
        if (!sql) {
            cacheLoaded = true;
            return;
        }

        try {
            const rows = await sql`SELECT * FROM agents WHERE active = true`;
            for (const row of rows) {
                const agent: Agent = {
                    id: row.id,
                    wallet: row.wallet,
                    services: row.services,
                    pricing: row.pricing,
                    reputation: row.reputation,
                    active: row.active,
                    createdAt: row.created_at,
                };
                agentCache.set(agent.wallet, agent);
            }
            console.log(`[Agent] Loaded ${rows.length} agents from database`);
            cacheLoaded = true;
        } catch (error) {
            console.error('[Agent] Failed to load from database:', error);
            cacheLoaded = true;
        }
    }

    // Find an existing agent by service type, or register a new one
    static async findOrRegister(
        services: ServiceDef[],
        pricing: PricingDef[]
    ): Promise<AgentRegistrationResult & { alreadyExisted: boolean }> {
        await this.loadCache();

        // Check if an agent with the same service types already exists
        const serviceTypes = services.map(s => s.type).sort().join(',');
        for (const [wallet, existing] of agentCache.entries()) {
            const existingTypes = existing.services.map((s: ServiceDef) => s.type).sort().join(',');
            if (existingTypes === serviceTypes && existing.active) {
                console.log(`[Agent] Found existing agent for [${serviceTypes}]: ${wallet.slice(0, 10)}...`);
                // Update pricing if changed
                existing.pricing = pricing;
                existing.services = services;
                agentCache.set(wallet, existing);
                const pk = agentKeys.get(wallet) || '';
                return { agent: existing, privateKey: pk, alreadyExisted: true };
            }
        }

        // No existing agent found, create a new one
        return { ...await this.register(services, pricing), alreadyExisted: false };
    }

    // Register a new agent with auto-generated wallet
    static async register(
        services: ServiceDef[],
        pricing: PricingDef[]
    ): Promise<AgentRegistrationResult> {
        await this.loadCache();

        const { address, privateKey } = generateAgentWallet();

        const agent: Agent = {
            id: generateId(),
            wallet: address,
            services,
            pricing,
            reputation: 500,
            active: true,
            createdAt: new Date(),
        };

        // Save to database
        const sql = getSQL();
        if (sql) {
            try {
                await sql`
                    INSERT INTO agents (id, wallet, services, pricing, reputation, active)
                    VALUES (${agent.id}, ${agent.wallet}, ${JSON.stringify(services)}, ${JSON.stringify(pricing)}, 500, true)
                    ON CONFLICT (wallet) DO UPDATE SET 
                        services = ${JSON.stringify(services)},
                        pricing = ${JSON.stringify(pricing)},
                        active = true,
                        updated_at = NOW()
                `;
            } catch (error) {
                console.error('[Agent] DB save error:', error);
            }
        }

        agentCache.set(agent.wallet, agent);
        agentKeys.set(agent.wallet, privateKey);

        console.log(`[Agent] Registered: ${agent.wallet.slice(0, 10)}... | Services: ${services.map(s => s.type).join(', ')}`);

        return { agent, privateKey };
    }

    // Execute a service by calling the ACTUAL Python agents
    static async execute(
        wallet: string,
        serviceType: string,
        input: unknown
    ): Promise<ExecutionResult> {
        await this.loadCache();
        const agent = agentCache.get(wallet);
        if (!agent) throw new Error('Agent not found');
        if (!agent.active) throw new Error('Agent is not active');

        const service = agent.services.find((s: ServiceDef) => s.type === serviceType);
        if (!service) throw new Error(`Agent does not provide ${serviceType} service`);

        const pricing = agent.pricing.find((p: PricingDef) => p.serviceType === serviceType);
        const cost = pricing?.priceUsdc || 0;

        const startTime = Date.now();

        // Extract text from input
        const inputText = typeof input === 'string' ? input :
            String((input as Record<string, unknown>)?.text ||
                (input as Record<string, unknown>)?.prompt ||
                (input as Record<string, unknown>)?.url ||
                JSON.stringify(input));

        // Call the Python agent via subprocess
        const output = await this.callPythonAgent(serviceType, inputText as string);

        const duration = Date.now() - startTime;

        console.log(`[Agent] ${wallet.slice(0, 10)}... executed ${serviceType} via Python | Cost: $${cost} | ${duration}ms`);

        return { success: true, output, cost, duration };
    }

    // Call Python agent and get result
    private static callPythonAgent(serviceType: string, inputText: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const agentsDir = path.join(__dirname, '..', '..', '..', 'agents');

            console.log(`[Python Agent] Starting ${serviceType} agent...`);

            // Python script to execute the agent with logging
            const pythonCode = `
import sys
sys.path.insert(0, '${agentsDir.replace(/\\/g, '\\\\')}')
from specialists import SummarizerAgent, TranslatorAgent, ScraperAgent, ImageGenAgent, PDFLoaderAgent

agent_map = {
    'summarizer': SummarizerAgent,
    'translation': TranslatorAgent,
    'scraper': ScraperAgent,
    'image_gen': ImageGenAgent,
    'pdf_loader': PDFLoaderAgent
}

service_type = '${serviceType}'
input_text = """${inputText.replace(/"""/g, '\\"\\"\\"').replace(/\\/g, '\\\\')}"""

print(f"[{service_type.upper()}] Processing input: {input_text[:50]}...", file=sys.stderr)

if service_type in agent_map:
    agent = agent_map[service_type]()
    print(f"[{agent.name}] Calling Gemini AI...", file=sys.stderr)
    result = agent.execute(input_text)
    print(f"[{agent.name}] Done! Output length: {len(result['output'])} chars", file=sys.stderr)
    print(result['output'])
else:
    print(f"Unknown service type: {service_type}")
`;

            const python = spawn('python', ['-c', pythonCode], { cwd: agentsDir });

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            python.stderr.on('data', (data) => {
                const log = data.toString().trim();
                stderr += log;
                // Print Python logs to Node.js console in real-time
                if (log) console.log(`[Python] ${log}`);
            });

            python.on('close', (code) => {
                if (code === 0) {
                    console.log(`[Python Agent] ${serviceType} completed successfully`);
                    resolve(stdout.trim() || 'No output from agent');
                } else {
                    console.error(`[Python Agent] Error (exit code ${code}): ${stderr.slice(0, 200)}`);
                    resolve(`Python agent error: ${stderr.slice(0, 200) || 'Unknown error'}`);
                }
            });

            python.on('error', (err) => {
                console.error(`[Agent] Failed to spawn Python:`, err);
                resolve(`Failed to run Python agent: ${err.message}`);
            });
        });
    }

    // Get agent's private key (for payment signing)
    static getPrivateKey(wallet: string): string | null {
        return agentKeys.get(wallet) || null;
    }

    // Get all agents
    static async getAll(): Promise<Agent[]> {
        await this.loadCache();
        return Array.from(agentCache.values()).filter((a: Agent) => a.active);
    }

    // Get agents by service type
    static async getByServiceType(serviceType: string): Promise<Agent[]> {
        await this.loadCache();
        return Array.from(agentCache.values()).filter(
            (a: Agent) => a.active && a.services.some((s: ServiceDef) => s.type === serviceType)
        );
    }

    // Get agent by wallet address
    static async getByWallet(wallet: string): Promise<Agent | null> {
        await this.loadCache();
        return agentCache.get(wallet) || null;
    }

    // Update agent reputation
    static async updateReputation(wallet: string, delta: number): Promise<Agent | null> {
        await this.loadCache();
        const agent = agentCache.get(wallet);
        if (!agent) return null;

        agent.reputation = Math.max(0, Math.min(1000, agent.reputation + delta));
        agentCache.set(wallet, agent);

        // Update in database
        const sql = getSQL();
        if (sql) {
            await sql`UPDATE agents SET reputation = ${agent.reputation}, updated_at = NOW() WHERE wallet = ${wallet}`;
        }
        return agent;
    }

    // Deactivate agent
    static async deactivate(wallet: string): Promise<boolean> {
        await this.loadCache();
        const agent = agentCache.get(wallet);
        if (!agent) return false;

        agent.active = false;
        agentCache.set(wallet, agent);

        // Update in database
        const sql = getSQL();
        if (sql) {
            await sql`UPDATE agents SET active = false, updated_at = NOW() WHERE wallet = ${wallet}`;
        }
        return true;
    }
}
