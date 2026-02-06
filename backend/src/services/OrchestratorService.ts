import { AgentService } from './AgentService';
import { PaymentService, RevenueShareService } from './PaymentService';
import { TransactionLogger } from './TransactionLogger';
import { YellowService } from './YellowService';
import { config } from '../config';
import { ContributionMetrics } from '../types';

// Agent pool address for payment routing - from environment config
const AGENT_POOL_ADDRESS = config.platformWallet;


// Workflow step definition
export interface WorkflowStep {
    serviceType: string;
    input: unknown;
    agentWallet?: string; // Optional: specify agent, otherwise auto-select cheapest
}

// Workflow execution result
export interface WorkflowResult {
    success: boolean;
    steps: StepResult[];
    totalCost: number;
    totalDuration: number;
    channelId?: string;
    revenueDistribution?: {
        participants: { wallet: string; share: number; payment: number }[];
    };
    error?: string;
}

export interface StepResult {
    step: number;
    serviceType: string;
    agentWallet: string;
    input: unknown;
    output: unknown;
    cost: number;
    duration: number;
    outputSizeBytes: number;
    paymentTxId?: string;
    metrics?: ContributionMetrics;
}

export class OrchestratorService {
    /**
     * Execute a multi-step workflow with automatic agent selection and payment routing
     * @param orchestratorWallet - Wallet of the orchestrator (pays for all steps)
     * @param workflowSteps - Array of steps to execute
     * @param channelId - Optional: Pre-opened payment channel
     * @param budget - Optional: Budget for the workflow in wei (default: 0.01 ETH)
     */
    static async executeWorkflow(
        orchestratorWallet: string,
        workflowSteps: WorkflowStep[],
        channelId?: string,
        budget: string = '10000000000000000' // 0.01 ETH default
    ): Promise<WorkflowResult> {
        const results: StepResult[] = [];
        let totalCost = 0;
        let totalDuration = 0;
        const startTime = Date.now();
        let activeChannelId = channelId;

        console.log(`\n[Orchestrator] Starting workflow with ${workflowSteps.length} steps...`);
        console.log(`[Orchestrator] Payer: ${orchestratorWallet.slice(0, 10)}...`);

        try {
            // Verify channel exists if provided, or create new one
            if (activeChannelId) {
                const existingChannel = await YellowService.getChannel(activeChannelId);
                if (!existingChannel) {
                    console.log(`[Orchestrator] Provided channel ${activeChannelId} not found, creating new one`);
                    activeChannelId = undefined; // Will create new channel below
                }
            }

            // Create payment channel if not provided or not found
            if (!activeChannelId) {
                console.log(`[Orchestrator] Creating payment channel with budget: ${budget} wei`);
                const session = await YellowService.createSession(
                    orchestratorWallet,
                    AGENT_POOL_ADDRESS,
                    budget,
                    '0'
                );
                activeChannelId = session.channelId;
                console.log(`[Orchestrator] Channel created: ${activeChannelId}`);
            }

            let previousOutput: unknown = null;


            for (let i = 0; i < workflowSteps.length; i++) {
                const step = workflowSteps[i];
                const stepStartTime = Date.now();

                console.log(`\n[Orchestrator] Step ${i + 1}/${workflowSteps.length}: ${step.serviceType}`);

                // 1. Select agent (specified or cheapest available)
                let selectedAgent;
                if (step.agentWallet) {
                    selectedAgent = await AgentService.getByWallet(step.agentWallet);
                    if (!selectedAgent) {
                        throw new Error(`Agent ${step.agentWallet} not found`);
                    }
                } else {
                    // Auto-select cheapest agent for this service type
                    const candidates = await AgentService.getByServiceType(step.serviceType);
                    if (candidates.length === 0) {
                        throw new Error(`No agents available for ${step.serviceType}`);
                    }

                    // Sort by price (ascending) and reputation (descending)
                    selectedAgent = candidates.sort((a, b) => {
                        const priceA = a.pricing.find(p => p.serviceType === step.serviceType)?.priceUsdc || Infinity;
                        const priceB = b.pricing.find(p => p.serviceType === step.serviceType)?.priceUsdc || Infinity;
                        if (priceA !== priceB) return priceA - priceB;
                        return b.reputation - a.reputation; // Tie-break by reputation
                    })[0];
                }

                console.log(`[Orchestrator] Selected agent: ${selectedAgent.wallet.slice(0, 10)}...`);

                // 2. Prepare input (use previous output if this is a chained step)
                const stepInput = i === 0 ? step.input : previousOutput;

                // 3. Execute service
                const execution = await AgentService.execute(
                    selectedAgent.wallet,
                    step.serviceType,
                    stepInput
                );

                // 4. Process payment - Route to AGENT_POOL (channel's agentB), track actual agent for logging
                let paymentTxId: string | undefined;
                if (execution.cost > 0) {
                    // execution.cost is in USD (like $0.05)
                    // Convert USD to ETH: $0.05 / $3000 per ETH = 0.0000167 ETH
                    // Then convert to wei: * 1e18
                    const ETH_PRICE_USD = 3000; // TODO: fetch real price from oracle
                    const costInEth = execution.cost / ETH_PRICE_USD;
                    const costInWei = Math.floor(costInEth * 1e18);

                    // Route payment through Yellow state channel to AGENT_POOL_ADDRESS
                    // The actual agent wallet is tracked separately for logging purposes
                    const payment = await PaymentService.transfer(
                        activeChannelId || 'default-channel',
                        orchestratorWallet,
                        AGENT_POOL_ADDRESS,   // Payment goes to pool (channel's agentB)
                        costInWei,            // Now in wei
                        undefined,
                        selectedAgent.wallet  // Track actual agent for logging
                    );
                    paymentTxId = payment.transaction.id;
                    console.log(`[Orchestrator] Payment: $${execution.cost} USD = ${costInEth.toFixed(8)} ETH (${costInWei} wei) -> ${selectedAgent.wallet.slice(0, 10)}...`);
                }

                // 5. Update reputation (success)
                await AgentService.updateReputation(selectedAgent.wallet, 10);

                const stepDuration = Date.now() - stepStartTime;
                totalCost += execution.cost;
                totalDuration += stepDuration;

                // Calculate output size for metrics
                const outputStr = JSON.stringify(execution.output);
                const outputSizeBytes = new TextEncoder().encode(outputStr).length;

                // Create contribution metrics
                const metrics = RevenueShareService.createMetrics(
                    step.serviceType,
                    stepDuration,
                    outputSizeBytes,
                    1.0 // Default quality score
                );

                // 6. Store result with metrics
                results.push({
                    step: i + 1,
                    serviceType: step.serviceType,
                    agentWallet: selectedAgent.wallet,
                    input: stepInput,
                    output: execution.output,
                    cost: execution.cost,
                    duration: stepDuration,
                    outputSizeBytes,
                    paymentTxId,
                    metrics,
                });

                previousOutput = execution.output;
            }

            const workflowDuration = Date.now() - startTime;
            console.log(`\n[Orchestrator] Workflow completed in ${workflowDuration}ms`);
            console.log(`[Orchestrator] Total cost: $${totalCost} | Steps: ${results.length}`);

            // Calculate revenue distribution using dynamic weights
            const participants = results.map(r => ({
                wallet: r.agentWallet,
                serviceType: r.serviceType,
                metrics: r.metrics!,
            }));
            const distribution = RevenueShareService.distributePayments(
                'workflow-' + Date.now(),
                totalCost,
                participants
            );

            console.log(`[Orchestrator] Revenue distribution:`);
            distribution.participants.forEach(p => {
                console.log(`  - ${p.agentWallet.slice(0, 10)}... (${p.serviceType}): $${p.finalPayment.toFixed(4)} (${(p.normalizedWeight * 100).toFixed(1)}%)`);
            });

            // Log workflow to database
            await TransactionLogger.logWorkflow(
                {
                    orchestratorWallet,
                    totalSteps: workflowSteps.length,
                    totalCost,
                    totalDuration: workflowDuration,
                    status: 'completed'
                },
                results.map(r => ({
                    stepNumber: r.step,
                    serviceType: r.serviceType,
                    agentWallet: r.agentWallet,
                    cost: r.cost,
                    duration: r.duration,
                    paymentTxId: r.paymentTxId
                }))
            );

            return {
                success: true,
                steps: results,
                totalCost,
                totalDuration: workflowDuration,
                channelId: activeChannelId,
                revenueDistribution: {
                    participants: distribution.participants.map(p => ({
                        wallet: p.agentWallet,
                        share: p.normalizedWeight,
                        payment: p.finalPayment,
                    })),
                },
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Orchestrator] ✗ Workflow failed: ${errorMessage}`);

            return {
                success: false,
                steps: results,
                totalCost,
                totalDuration: Date.now() - startTime,
                error: errorMessage,
            };
        }
    }

    /**
     * Get pricing comparison for a service across all available agents
     */
    static async getPricingComparison(serviceType: string) {
        const agents = await AgentService.getByServiceType(serviceType);

        return agents.map(agent => {
            const pricing = agent.pricing.find(p => p.serviceType === serviceType);
            return {
                wallet: agent.wallet,
                price: pricing?.priceUsdc || 0,
                reputation: agent.reputation,
                active: agent.active,
            };
        }).sort((a, b) => a.price - b.price);
    }
}
