import { Router } from 'express';
import { OrchestratorService, WorkflowStep } from '../services/OrchestratorService';

const router = Router();

/**
 * POST /api/orchestrator/workflow
 * Execute a multi-step workflow with automatic agent selection
 * 
 * Body:
 * {
 *   orchestratorWallet: string,
 *   steps: [
 *     { serviceType: 'scraper', input: { url: '...' } },
 *     { serviceType: 'summarizer', input: null }, // Uses previous output
 *     { serviceType: 'translation', input: null, agentWallet: '0x...' } // Optional: specific agent
 *   ],
 *   channelId?: string
 * }
 */
router.post('/workflow', async (req, res) => {
    try {
        const { orchestratorWallet, steps, channelId, userWallet } = req.body;

        if (!orchestratorWallet || !steps || !Array.isArray(steps)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: orchestratorWallet, steps'
            });
        }

        const result = await OrchestratorService.executeWorkflow(
            orchestratorWallet,
            steps as WorkflowStep[],
            channelId,
            userWallet
        );

        res.json({ success: true, data: result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: message });
    }
});

/**
 * GET /api/orchestrator/pricing/:serviceType
 * Compare pricing for a service across all agents
 */
router.get('/pricing/:serviceType', async (req, res) => {
    try {
        const { serviceType } = req.params;
        const comparison = await OrchestratorService.getPricingComparison(serviceType);

        res.json({ success: true, data: comparison });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: message });
    }
});

/**
 * POST /api/orchestrator/end-session
 * End a user session and settle all payments on Base Sepolia
 * 
 * Body:
 * {
 *   channel_id: string,
 *   private_key?: string  // Optional, uses server key if not provided
 * }
 */
router.post('/end-session', async (req, res) => {
    try {
        const { channel_id, private_key } = req.body;

        if (!channel_id) {
            return res.status(400).json({
                success: false,
                error: 'channel_id is required'
            });
        }

        console.log(`[Orchestrator] Ending session for channel: ${channel_id}`);

        // Import YellowService for settlement
        const { YellowService } = await import('../services/YellowService');

        // Get channel info before settlement
        const channel = await YellowService.getChannel(channel_id);
        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found'
            });
        }

        // Get transaction history
        const transactions = await YellowService.getTransactions(channel_id);

        // Settle on Base Sepolia
        const settlement = await YellowService.settleOnChain(channel_id, private_key);

        if (settlement.success) {
            res.json({
                success: true,
                data: {
                    message: 'Session ended successfully!',
                    channel_id: channel_id,
                    settlement: {
                        tx_hash: settlement.txHash,
                        block_number: settlement.blockNumber,
                        gas_used: settlement.gasUsed,
                        explorer_url: settlement.explorerUrl,
                        chain: 'Base Sepolia',
                    },
                    session_summary: {
                        total_transactions: transactions.length,
                        final_balance_user: channel.balanceA,
                        final_balance_agents: channel.balanceB,
                    },
                },
            });
            console.log(`[Orchestrator] Session ended, settled on Base Sepolia: ${settlement.txHash}`);
        } else {
            res.status(400).json({
                success: false,
                error: settlement.error || 'Settlement failed',
            });
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Orchestrator] End session error:', error);
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
