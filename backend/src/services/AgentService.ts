import { Agent, ServiceDef, PricingDef } from '../types';
import { generateAgentWallet, generateId } from '../utils/blockchain';

// In-memory storage (replace with PostgreSQL later)
const agents: Map<string, Agent> = new Map();

export class AgentService {
    // Register a new agent
    static async register(
        services: ServiceDef[],
        pricing: PricingDef[]
    ): Promise<Agent> {
        const { address, privateKey } = generateAgentWallet();

        const agent: Agent = {
            id: generateId(),
            wallet: address,
            services,
            pricing,
            reputation: 500, // Start at 50% (scale 0-1000)
            active: true,
            createdAt: new Date(),
        };

        agents.set(agent.wallet, agent);

        // Note: privateKey should be securely stored/returned to the agent
        console.log(`Agent registered: ${agent.wallet}`);

        return agent;
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
