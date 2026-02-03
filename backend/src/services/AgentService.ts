import { Agent, ServiceDef, PricingDef } from '../types';
import { generateAgentWallet, generateId } from '../utils/blockchain';

// In-memory storage (replace with PostgreSQL later)
const agents: Map<string, Agent> = new Map();
// Store private keys separately (in production, agent keeps its own key)
const agentKeys: Map<string, string> = new Map();

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
    // Register a new agent with auto-generated wallet
    static async register(
        services: ServiceDef[],
        pricing: PricingDef[]
    ): Promise<AgentRegistrationResult> {
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

        agents.set(agent.wallet, agent);
        agentKeys.set(agent.wallet, privateKey);

        console.log(`[Agent] Registered: ${agent.wallet.slice(0, 10)}... | Services: ${services.map(s => s.type).join(', ')}`);

        return { agent, privateKey };
    }

    // Execute a service (mock for demo - real execution would call AI)
    static async execute(
        wallet: string,
        serviceType: string,
        input: unknown
    ): Promise<ExecutionResult> {
        const agent = agents.get(wallet);
        if (!agent) throw new Error('Agent not found');
        if (!agent.active) throw new Error('Agent is not active');

        const service = agent.services.find(s => s.type === serviceType);
        if (!service) throw new Error(`Agent does not provide ${serviceType} service`);

        const pricing = agent.pricing.find(p => p.serviceType === serviceType);
        const cost = pricing?.priceUsdc || 0;

        const startTime = Date.now();

        // Mock execution based on service type
        let output: unknown;
        switch (serviceType) {
            case 'translation':
                output = { translated: `[Translated] ${JSON.stringify(input)}`, language: 'es' };
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
        return Array.from(agents.values()).filter((a) => a.active);
    }

    // Get agents by service type
    static async getByServiceType(serviceType: string): Promise<Agent[]> {
        return Array.from(agents.values()).filter(
            (a) => a.active && a.services.some((s) => s.type === serviceType)
        );
    }

    // Get agent by wallet address
    static async getByWallet(wallet: string): Promise<Agent | null> {
        return agents.get(wallet) || null;
    }

    // Update agent reputation
    static async updateReputation(wallet: string, delta: number): Promise<Agent | null> {
        const agent = agents.get(wallet);
        if (!agent) return null;

        agent.reputation = Math.max(0, Math.min(1000, agent.reputation + delta));
        agents.set(wallet, agent);
        return agent;
    }

    // Deactivate agent
    static async deactivate(wallet: string): Promise<boolean> {
        const agent = agents.get(wallet);
        if (!agent) return false;

        agent.active = false;
        agents.set(wallet, agent);
        return true;
    }
}
