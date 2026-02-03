import { Router, Request, Response } from 'express';
import { YellowService } from '../services/YellowService';
import { ApiResponse, SavingsMetrics, Transaction } from '../types';

const router = Router();

// Get gas savings metrics
router.get('/savings', async (_req: Request, res: Response) => {
    try {
        const metrics = await YellowService.getSavingsMetrics();

        res.json({
            success: true,
            data: metrics,
        } as ApiResponse<SavingsMetrics>);
    } catch (error) {
        console.error('Error fetching savings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch savings metrics',
        } as ApiResponse<null>);
    }
});

// Get transaction history
router.get('/transactions', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const transactions = await YellowService.getTransactions(limit, offset);

        res.json({
            success: true,
            data: transactions,
        } as ApiResponse<Transaction[]>);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions',
        } as ApiResponse<null>);
    }
});

export default router;
