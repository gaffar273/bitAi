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

        const transactions = await YellowService.getTransactions(undefined, limit, offset);

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

// Get Yellow Network Proof Ledger (ClearNode interactions)
router.get('/yellow-proof', async (_req: Request, res: Response) => {
    try {
        const ledger = YellowService.getLedger();
        res.json({
            success: true,
            data: ledger,
        });
    } catch (error) {
        console.error('Error fetching Yellow ledger:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Yellow proof ledger',
        });
    }
});

export default router;
