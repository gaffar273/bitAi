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
        const { orchestratorWallet, steps, channelId } = req.body;

        if (!orchestratorWallet || !steps || !Array.isArray(steps)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: orchestratorWallet, steps'
            });
        }

        const result = await OrchestratorService.executeWorkflow(
            orchestratorWallet,
            steps as WorkflowStep[],
            channelId
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

export default router;
