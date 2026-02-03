import { Router, Request, Response } from 'express';
import { AgentService } from '../services/AgentService';
import { ApiResponse, Agent } from '../types';

const router = Router();

// Register a new agent
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { services, pricing } = req.body;

        if (!services || !pricing) {
            res.status(400).json({
                success: false,
                error: 'Services and pricing are required',
            } as ApiResponse<null>);
            return;
        }

        const agent = await AgentService.register(services, pricing);

        res.status(201).json({
            success: true,
            data: agent,
        } as ApiResponse<Agent>);
    } catch (error) {
        console.error('Error registering agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register agent',
        } as ApiResponse<null>);
    }
});

// Get all agents or filter by service type
router.get('/', async (req: Request, res: Response) => {
    try {
        const { service_type } = req.query;

        let agents: Agent[];
        if (service_type) {
            agents = await AgentService.getByServiceType(service_type as string);
        } else {
            agents = await AgentService.getAll();
        }

        res.json({
            success: true,
            data: agents,
        } as ApiResponse<Agent[]>);
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agents',
        } as ApiResponse<null>);
    }
});

// Get agent by wallet address
router.get('/:wallet', async (req: Request, res: Response) => {
    try {
        const wallet = req.params.wallet as string;
        const agent = await AgentService.getByWallet(wallet);

        if (!agent) {
            res.status(404).json({
                success: false,
                error: 'Agent not found',
            } as ApiResponse<null>);
            return;
        }

        res.json({
            success: true,
            data: agent,
        } as ApiResponse<Agent>);
    } catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent',
        } as ApiResponse<null>);
    }
});

// Update agent reputation
router.patch('/:wallet/reputation', async (req: Request, res: Response) => {
    try {
        const wallet = req.params.wallet as string;
        const { delta } = req.body;

        if (typeof delta !== 'number') {
            res.status(400).json({
                success: false,
                error: 'Delta must be a number',
            } as ApiResponse<null>);
            return;
        }

        const agent = await AgentService.updateReputation(wallet, delta);

        if (!agent) {
            res.status(404).json({
                success: false,
                error: 'Agent not found',
            } as ApiResponse<null>);
            return;
        }

        res.json({
            success: true,
            data: agent,
        } as ApiResponse<Agent>);
    } catch (error) {
        console.error('Error updating reputation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update reputation',
        } as ApiResponse<null>);
    }
});

// Deactivate agent
router.delete('/:wallet', async (req: Request, res: Response) => {
    try {
        const wallet = req.params.wallet as string;
        const success = await AgentService.deactivate(wallet);

        if (!success) {
            res.status(404).json({
                success: false,
                error: 'Agent not found',
            } as ApiResponse<null>);
            return;
        }

        res.json({
            success: true,
            data: { deactivated: true },
        } as ApiResponse<{ deactivated: boolean }>);
    } catch (error) {
        console.error('Error deactivating agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deactivate agent',
        } as ApiResponse<null>);
    }
});

export default router;
