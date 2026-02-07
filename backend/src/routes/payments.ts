import { Router, Request, Response } from 'express';
import { YellowService } from '../services/YellowService';
import { ApiResponse, PaymentChannel, StateUpdate, Transaction } from '../types';

const router = Router();

// Open a new payment channel via Yellow Network
router.post('/channel/open', async (req: Request, res: Response) => {
    try {
        const { agent_a, agent_b, balance_a, balance_b, private_key } = req.body;

        if (!agent_a || !agent_b) {
            res.status(400).json({
                success: false,
                error: 'agent_a and agent_b addresses are required',
            } as ApiResponse<null>);
            return;
        }

        if (!balance_a || !balance_b) {
            res.status(400).json({
                success: false,
                error: 'balance_a and balance_b are required (in wei)',
            } as ApiResponse<null>);
            return;
        }

        const result = await YellowService.createSession(
            agent_a,
            agent_b,
            balance_a,
            balance_b,
            private_key // Optional - for SDK integration
        );

        res.status(201).json({
            success: true,
            data: {
                channel_id: result.channelId,
                session_id: result.sessionId,
            },
        } as ApiResponse<{ channel_id: string; session_id: string }>);
    } catch (error) {
        console.error('Error opening channel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to open channel',
        } as ApiResponse<null>);
    }
});

// Transfer funds within a channel (instant, 0 gas via Yellow)
router.post('/transfer', async (req: Request, res: Response) => {
    try {
        const { channel_id, from, to, amount, private_key } = req.body;

        if (!channel_id || !from || !to || !amount) {
            res.status(400).json({
                success: false,
                error: 'channel_id, from, to, and amount are required',
            } as ApiResponse<null>);
            return;
        }

        const result = await YellowService.sendPayment(
            channel_id,
            from,
            to,
            amount.toString(),
            private_key // Optional
        );

        const state = await YellowService.getState(channel_id);

        res.json({
            success: true,
            data: {
                new_state: state,
                transaction: result.transaction,
                gas_cost: 0, // Yellow = 0 gas
            },
        } as ApiResponse<{ new_state: StateUpdate | null; transaction: Transaction; gas_cost: number }>);
    } catch (error: unknown) {
        console.error('Error transferring:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to transfer';
        res.status(400).json({
            success: false,
            error: errorMessage,
        } as ApiResponse<null>);
    }
});

// Get channel state
router.get('/channel/:channelId', async (req: Request, res: Response) => {
    try {
        const channelId = req.params.channelId as string;
        const channel = await YellowService.getChannel(channelId);

        if (!channel) {
            res.status(404).json({
                success: false,
                error: 'Channel not found',
            } as ApiResponse<null>);
            return;
        }

        res.json({
            success: true,
            data: channel,
        } as ApiResponse<PaymentChannel>);
    } catch (error) {
        console.error('Error fetching channel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch channel',
        } as ApiResponse<null>);
    }
});

// Settle a channel (return off-chain batch instructions or initiate settlement)
router.post('/settle', async (req: Request, res: Response) => {
    try {
        const { channel_id, private_key } = req.body;

        if (!channel_id) {
            res.status(400).json({
                success: false,
                error: 'channel_id is required',
            } as ApiResponse<null>);
            return;
        }

        console.log(`[Payments] Settlement requested for channel: ${channel_id}`);

        // If private_key is provided, we can still do server-side signing (legacy/testing support)
        if (private_key) {
            const result = await YellowService.settle(channel_id, private_key);
            res.json({
                success: true,
                data: {
                    tx_hash: result.settleTxHash,
                    channel_id: result.channelId,
                    status: result.status,
                    final_balances: {
                        [result.agentA]: result.balanceA,
                        [result.agentB]: result.balanceB,
                    },
                    settlement_result: result.settlementResult,
                    gas_cost_usd: 0.01,
                    message: 'Channel settled via Yellow ClearNode (Server-Signed)',
                },
            });
            return;
        }

        // Otherwise, assume we want fallback on-chain settlement data for Client Signing
        // Note: For real Yellow Network integration, this would return an unsigned CloseChannel message.
        // For this demo (Base Sepolia fallback), we return the on-chain tx data.

        // Get the channel to find user address
        const channel = await YellowService.getChannel(channel_id);
        if (!channel) {
            res.status(404).json({ success: false, error: 'Channel not found' });
            return;
        }
        const txData = await YellowService.getSettlementData(channel_id, channel.agentA);

        res.json({
            success: true,
            data: {
                requires_signing: true,
                tx_data: txData,
                message: 'Please sign the settlement transaction with your wallet',
            },
        });

    } catch (error: unknown) {
        console.error('Error settling channel:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to settle channel';
        res.status(400).json({
            success: false,
            error: errorMessage,
        } as ApiResponse<null>);
    }
});

// Settle directly on Base Sepolia (real on-chain transaction)
router.post('/settle/onchain', async (req: Request, res: Response) => {
    try {
        const { channel_id, private_key } = req.body;

        if (!channel_id) {
            res.status(400).json({
                success: false,
                error: 'channel_id is required',
            } as ApiResponse<null>);
            return;
        }

        // Legacy: Server-side signing if private key provided
        if (private_key) {
            const result = await YellowService.settleOnChain(channel_id, private_key);
            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        tx_hash: result.txHash,
                        block_number: result.blockNumber,
                        gas_used: result.gasUsed,
                        explorer_url: result.explorerUrl,
                        chain: 'Base Sepolia',
                        chain_id: 84532,
                        message: 'Settlement confirmed on Base Sepolia testnet!',
                    },
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error || 'On-chain settlement failed',
                } as ApiResponse<null>);
            }
            return;
        }

        // New Flow: Return unsigned data for client
        const channel = await YellowService.getChannel(channel_id);
        if (!channel) {
            res.status(404).json({ success: false, error: 'Channel not found' });
            return;
        }
        const txData = await YellowService.getSettlementData(channel_id, channel.agentA);

        res.json({
            success: true,
            data: {
                requires_signing: true,
                tx_data: txData,
                channel_id,
                message: 'Please sign the on-chain settlement transaction',
            }
        });

    } catch (error: unknown) {
        console.error('Error with on-chain settlement:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to settle on-chain';
        res.status(400).json({
            success: false,
            error: errorMessage,
        } as ApiResponse<null>);
    }
});

// Get transaction history for a channel
router.get('/channel/:channelId/transactions', async (req: Request, res: Response) => {
    try {
        const channelId = req.params.channelId as string;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const transactions = await YellowService.getTransactions(channelId, limit, offset);

        res.json({
            success: true,
            data: {
                channelId,
                transactions,
                count: transactions.length,
            },
        });
    } catch (error) {
        console.error('Error fetching channel transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch channel transactions',
        } as ApiResponse<null>);
    }
});

// Get all channels (for debugging/admin)
router.get('/channels', async (_req: Request, res: Response) => {
    try {
        // Get savings metrics which includes channel count
        const metrics = await YellowService.getSavingsMetrics();

        res.json({
            success: true,
            data: {
                totalTransactions: metrics.totalTransactions,
                savingsPercent: metrics.savingsPercent,
            },
        });
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch channels',
        } as ApiResponse<null>);
    }
});

export default router;

