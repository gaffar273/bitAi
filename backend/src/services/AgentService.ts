import { Agent, ServiceDef, PricingDef } from '../types';
import { generateAgentWallet, generateId } from '../utils/blockchain';
import { getSQL } from './DatabaseService';

// In-memory cache (used when database not available or for fast lookups)
const agentsCache: Map<string, Agent> = new Map();
// Store private keys separately (in production, agent keeps its own key)
const agentKeys: Map<string, string> = new Map();
// Track if we've loaded from DB
let cacheInitialized = false;

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
    // Initialize cache from database on first call
    private static async ensureCacheInitialized(): Promise<void> {
        if (cacheInitialized) return;

        const sql = getSQL();
        if (sql) {
            try {
                const rows = await sql`
                    SELECT id, wallet, services, pricing, reputation, active, created_at
                    FROM agents
                    WHERE active = true
                `;

                for (const row of rows) {
                    const agent: Agent = {
                        id: row.id,
                        wallet: row.wallet,
                        services: row.services as ServiceDef[],
                        pricing: row.pricing as PricingDef[],
                        reputation: row.reputation,
                        active: row.active,
                        createdAt: row.created_at,
                    };
                    agentsCache.set(agent.wallet, agent);
                }

                console.log(`[Agent] Loaded ${rows.length} agents from database`);
            } catch (error) {
                console.error('[Agent] Failed to load agents from database:', error);
            }
        }

        cacheInitialized = true;
    }

    // Register a new agent with auto-generated wallet
    static async register(
        services: ServiceDef[],
        pricing: PricingDef[]
    ): Promise<AgentRegistrationResult> {
        await this.ensureCacheInitialized();

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

        // Save to database if available
        const sql = getSQL();
        if (sql) {
            try {
                await sql`
                    INSERT INTO agents (id, wallet, services, pricing, reputation, active, created_at)
                    VALUES (${agent.id}, ${agent.wallet}, ${JSON.stringify(services)}, ${JSON.stringify(pricing)}, ${agent.reputation}, ${agent.active}, ${agent.createdAt})
                `;
                console.log(`[Agent] Saved to database: ${agent.wallet.slice(0, 10)}...`);
            } catch (error) {
                console.error('[Agent] Failed to save agent to database:', error);
            }
        }

        // Always update cache
        agentsCache.set(agent.wallet, agent);
        agentKeys.set(agent.wallet, privateKey);

        console.log(`[Agent] Registered: ${agent.wallet.slice(0, 10)}... | Services: ${services.map(s => s.type).join(', ')}`);

        return { agent, privateKey };
    }

    /**
     * Execute a service by calling the Python agent server.
     * Falls back to mock if agent server is not available.
     */
    static async execute(
        wallet: string,
        serviceType: string,
        input: unknown
    ): Promise<ExecutionResult> {
        await this.ensureCacheInitialized();

        const agent = agentsCache.get(wallet);
        if (!agent) throw new Error('Agent not found');
        if (!agent.active) throw new Error('Agent is not active');

        const service = agent.services.find(s => s.type === serviceType);
        if (!service) throw new Error(`Agent does not provide ${serviceType} service`);

        const pricing = agent.pricing.find(p => p.serviceType === serviceType);
        const cost = pricing?.priceUsdc || 0;

        const startTime = Date.now();

        // Try to call the Python agent server
        const agentServerUrl = process.env.AGENT_SERVER_URL || 'http://localhost:5001';

        // Prepare input
        let processedInput = input;

        // Special handling for pdf_loader with DB storage
        if (serviceType === 'pdf_loader') {
            console.log(`[Agent] Input type for pdf_loader: ${typeof input}`);

            let fileId: string | undefined;
            let inputParsed: any = {};

            try {
                if (typeof input === 'string') {
                    console.log(`[Agent] Raw input string: ${input}`);
                    // Try to parse string input
                    try {
                        if (input.trim().startsWith('{')) {
                            inputParsed = JSON.parse(input);
                            fileId = inputParsed.fileId;
                        }
                    } catch (e) {
                        console.warn('[Agent] JSON parse failed, trying regex');
                    }

                    // Regex fallback if JSON parse failed or didn't find ID
                    if (!fileId && input.includes('fileId')) {
                        const match = input.match(/"fileId"\s*:\s*"([^"]+)"/);
                        if (match) fileId = match[1];
                    }
                } else if (typeof input === 'object' && input !== null) {
                    console.log(`[Agent] Input object: ${JSON.stringify(input)}`);
                    // Already an object
                    inputParsed = input;
                    fileId = (input as any).fileId;
                }

                console.log(`[Agent] Extracted fileId: ${fileId}`);

                if (!fileId) {
                    throw new Error('Could not extract fileId from input. Please re-upload the file.');
                }

                if (fileId) {
                    const sql = getSQL();
                    if (sql) {
                        const fileRows = await sql`SELECT data, filename FROM file_uploads WHERE id = ${fileId}`;
                        console.log(`[Agent] DB lookup found ${fileRows.length} rows`);

                        if (fileRows.length > 0) {
                            console.log(`[Agent] Fetched PDF ${fileRows[0].filename} from database for processing`);
                            processedInput = {
                                ...inputParsed,
                                file_content: fileRows[0].data, // Base64 content
                                filename: fileRows[0].filename
                            };
                        } else {
                            // Throw error to stop execution and alert user
                            throw new Error(`File ID ${fileId} not found in database. Upload failed?`);
                        }
                    } else {
                        // Throw error if DB missing
                        throw new Error('[Agent] Database connection unavailable for file retrieval');
                    }
                }
            } catch (e) {
                console.warn('[Agent] Error processing pdf_loader input:', e);
                // Re-throw if it's our specific error
                if (e instanceof Error && e.message.includes('not found in database')) throw e;
                if (e instanceof Error && e.message.includes('Database connection unavailable')) throw e;
            }
        }


        let output: unknown;
        try {
            const response = await fetch(`${agentServerUrl}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_type: serviceType,
                    input: processedInput
                })
            });

            if (response.ok) {
                const result = await response.json() as { success: boolean; output?: unknown; error?: string };
                if (result.success) {
                    output = result.output;
                    console.log(`[Agent] ${wallet.slice(0, 10)}... executed ${serviceType} via Python agent | Cost: $${cost}`);
                } else {
                    throw new Error(result.error || 'Agent execution failed');
                }
            } else {
                throw new Error(`Agent server returned ${response.status}`);
            }
        } catch (error) {
            // Fallback to mock if agent server not available
            console.log(`[Agent] Python agent server not available, using mock for ${serviceType}`);
            switch (serviceType) {
                case 'translation':
                    output = { translated: `[Translated] ${JSON.stringify(input)}`, language: 'hi' };
                    break;
                case 'image_gen':
                    output = { imageUrl: `https://placeholder.com/ai-generated-${Date.now()}.png` };
                    break;
                case 'scraper':
                    output = { data: { title: 'Scraped Content', content: 'Mock scraped data...' } };
                    break;
                case 'summarizer':
                    output = { summary: `Summary of: ${JSON.stringify(input).slice(0, 50)}...` };
                    break;
                default:
                    output = { result: 'Service executed', input };
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Agent] ${wallet.slice(0, 10)}... executed ${serviceType} | Cost: $${cost}`);

        return { success: true, output, cost, duration };
    }

    // Get agent's private key (for payment signing)
    static getPrivateKey(wallet: string): string | null {
        return agentKeys.get(wallet) || null;
    }

    // Get all agents
    static async getAll(): Promise<Agent[]> {
        await this.ensureCacheInitialized();
        return Array.from(agentsCache.values()).filter((a) => a.active);
    }

    // Get agents by service type
    static async getByServiceType(serviceType: string): Promise<Agent[]> {
        await this.ensureCacheInitialized();
        return Array.from(agentsCache.values()).filter(
            (a) => a.active && a.services.some((s) => s.type === serviceType)
        );
    }

    // Get agent by wallet address
    static async getByWallet(wallet: string): Promise<Agent | null> {
        await this.ensureCacheInitialized();
        return agentsCache.get(wallet) || null;
    }

    // Update agent reputation
    static async updateReputation(wallet: string, delta: number): Promise<Agent | null> {
        await this.ensureCacheInitialized();

        const agent = agentsCache.get(wallet);
        if (!agent) return null;

        agent.reputation = Math.max(0, Math.min(1000, agent.reputation + delta));
        agentsCache.set(wallet, agent);

        // Update in database
        const sql = getSQL();
        if (sql) {
            try {
                await sql`
                    UPDATE agents SET reputation = ${agent.reputation}, updated_at = NOW()
                    WHERE wallet = ${wallet}
                `;
            } catch (error) {
                console.error('[Agent] Failed to update reputation in database:', error);
            }
        }

        return agent;
    }

    // Deactivate agent
    static async deactivate(wallet: string): Promise<boolean> {
        await this.ensureCacheInitialized();

        const agent = agentsCache.get(wallet);
        if (!agent) return false;

        agent.active = false;
        agentsCache.set(wallet, agent);

        // Update in database
        const sql = getSQL();
        if (sql) {
            try {
                await sql`
                    UPDATE agents SET active = false, updated_at = NOW()
                    WHERE wallet = ${wallet}
                `;
            } catch (error) {
                console.error('[Agent] Failed to deactivate agent in database:', error);
            }
        }

        return true;
    }

    // Store private key (for agents registered with external wallets)
    static setPrivateKey(wallet: string, privateKey: string): void {
        agentKeys.set(wallet, privateKey);
    }

    // Get agent count (for debugging)
    static async getCount(): Promise<{ cache: number; database: number }> {
        await this.ensureCacheInitialized();

        let dbCount = 0;
        const sql = getSQL();
        if (sql) {
            try {
                const result = await sql`SELECT COUNT(*) as count FROM agents WHERE active = true`;
                dbCount = parseInt(result[0].count, 10);
            } catch (error) {
                console.error('[Agent] Failed to get count from database:', error);
            }
        }

        return {
            cache: agentsCache.size,
            database: dbCount,
        };
    }

    // Clear all agents (for development/testing)
    static async clearAll(): Promise<number> {
        const sql = getSQL();
        let deleted = 0;

        if (sql) {
            try {
                const result = await sql`DELETE FROM agents RETURNING id`;
                deleted = result.length;
                console.log(`[Agent] Deleted ${deleted} agents from database`);
            } catch (error) {
                console.error('[Agent] Failed to clear agents from database:', error);
            }
        }

        // Clear cache
        agentsCache.clear();
        agentKeys.clear();
        cacheInitialized = false;

        console.log('[Agent] Cache cleared');
        return deleted;
    }
}
