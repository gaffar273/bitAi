import { Router, Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { YellowService } from '../services/YellowService';
import { config } from '../config';
import { ApiResponse } from '../types';

const router = Router();

// GET /api/wallet/platform-config - Get platform configuration for frontend
router.get('/platform-config', (req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            platformWallet: config.platformWallet,
            chainId: config.baseSepolia.chainId,
        }
    });
});

// POST /api/wallet/connect - Verify wallet ownership
router.post('/connect', async (req: Request, res: Response) => {
    try {
        const { address, signature, message } = req.body;

        if (!address || !signature || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: address, signature, message',
            });
        }

        const verification = await WalletService.verifyWalletSignature(address, signature, message);

        if (!verification.verified) {
            return res.status(401).json({
                success: false,
                error: verification.error || 'Signature verification failed',
            });
        }

        // Get balances after verification
        const balances = await WalletService.getBalances(address);

        res.json({
            success: true,
            data: {
                address,
                verified: true,
                balances: {
                    eth: balances.eth,
                    ethWei: balances.ethWei,
                },
            },
        });
    } catch (error) {
        console.error('[Wallet Route] Connect error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to connect wallet',
        });
    }
});

// GET /api/wallet/:address/balance - Get wallet balances
router.get('/:address/balance', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;

        const balances = await WalletService.getBalances(address);

        res.json({
            success: true,
            data: balances,
        });
    } catch (error) {
        console.error('[Wallet Route] Balance error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch balance',
        });
    }
});

// POST /api/wallet/:address/deposit - Record ETH deposit
router.post('/:address/deposit', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;
        const { amount, txHash, token = 'ETH' } = req.body;

        if (!amount || !txHash) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: amount, txHash',
            });
        }

        const deposit = await WalletService.trackDeposit(address, amount, txHash, token);

        res.json({
            success: true,
            data: {
                depositId: deposit.id,
                amount: deposit.amount,
                txHash: deposit.txHash,
                confirmed: deposit.confirmed,
                timestamp: deposit.timestamp,
            },
        });
    } catch (error) {
        console.error('[Wallet Route] Deposit error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to record deposit',
        });
    }
});

// GET /api/wallet/:address/channels - Get active Yellow channels
router.get('/:address/channels', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;

        const channels = await WalletService.getUserChannels(address);

        res.json({
            success: true,
            data: {
                address,
                channels,
                count: channels.length,
            },
        });
    } catch (error) {
        console.error('[Wallet Route] Channels error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch channels',
        });
    }
});

// POST /api/wallet/:address/fund-channel - Create/fund Yellow channel
router.post('/:address/fund-channel', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;
        const { amount, partnerAddress, private_key } = req.body;

        if (!amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: amount',
            });
        }

        // Use client's private key for signing if provided
        const channel = await WalletService.fundChannel(address, amount, partnerAddress, private_key);

        res.json({
            success: true,
            data: channel,
        });
    } catch (error) {
        console.error('[Wallet Route] Fund channel error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fund channel',
        });
    }
});

// POST /api/wallet/:address/settle - Settle channel using client wallet
router.post('/:address/settle', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;
        const { channel_id, private_key } = req.body;

        if (!channel_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: channel_id',
            });
        }

        if (!private_key) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: private_key (client must sign settlement)',
            });
        }

        console.log(`[Wallet] Client-initiated settlement for channel: ${channel_id}`);

        // Use client's private key for settlement signing
        const result = await YellowService.settle(channel_id, private_key);

        res.json({
            success: true,
            data: {
                channel_id: result.channelId,
                status: result.status,
                tx_hash: result.settleTxHash,
                final_balances: {
                    [result.agentA]: result.balanceA,
                    [result.agentB]: result.balanceB,
                },
                settlement_result: result.settlementResult,
                message: 'Channel settled using client wallet signature',
            },
        });
    } catch (error) {
        console.error('[Wallet Route] Settle error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to settle channel',
        });
    }
});

// POST /api/wallet/:address/settle/onchain - On-chain settlement using client wallet
router.post('/:address/settle/onchain', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;
        const { channel_id, private_key } = req.body;

        if (!channel_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: channel_id',
            });
        }

        if (!private_key) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: private_key (client must sign on-chain settlement)',
            });
        }

        console.log(`[Wallet] Client on-chain settlement for channel: ${channel_id}`);

        // Use client's private key for on-chain settlement
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
                    message: 'On-chain settlement completed using client wallet',
                },
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || 'On-chain settlement failed',
            });
        }
    } catch (error) {
        console.error('[Wallet Route] On-chain settle error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to settle on-chain',
        });
    }
});

// GET /api/wallet/:address/deposits - Get deposit history
router.get('/:address/deposits', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;

        const deposits = WalletService.getDeposits(address);

        res.json({
            success: true,
            data: {
                address,
                deposits,
                count: deposits.length,
            },
        });
    } catch (error) {
        console.error('[Wallet Route] Deposits error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch deposits',
        });
    }
});

// GET /api/wallet/:address/settle-data - Get settlement data for client-side signing
router.get('/:address/settle-data', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;
        const channelId = req.query.channel_id as string;

        if (!channelId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameter: channel_id',
            });
        }

        // Get channel data from YellowService
        const channel = await YellowService.getChannel(channelId);

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found',
            });
        }

        // Verify the address is part of this channel
        if (channel.agentA.toLowerCase() !== address.toLowerCase() &&
            channel.agentB.toLowerCase() !== address.toLowerCase()) {
            return res.status(403).json({
                success: false,
                error: 'Address is not a participant in this channel',
            });
        }

        // Return settlement data for client-side signing
        res.json({
            success: true,
            data: {
                channelId: channel.channelId,
                agentA: channel.agentA,
                agentB: channel.agentB,
                balanceA: channel.balanceA.toString(),
                balanceB: channel.balanceB.toString(),
                nonce: channel.nonce,
                status: channel.status,
                // Data to be signed by MetaMask
                settlementMessage: JSON.stringify({
                    type: 'YELLOW_SETTLEMENT',
                    channelId: channel.channelId,
                    finalBalances: {
                        [channel.agentA]: channel.balanceA,
                        [channel.agentB]: channel.balanceB,
                    },
                    nonce: channel.nonce,
                    timestamp: Date.now(),
                }),
            },
        });
    } catch (error) {
        console.error('[Wallet Route] Settle data error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get settlement data',
        });
    }
});

// POST /api/wallet/:address/settle-callback - Callback after client-side settlement
router.post('/:address/settle-callback', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;
        const { channel_id, tx_hash } = req.body;

        if (!channel_id || !tx_hash) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: channel_id, tx_hash',
            });
        }

        // Get channel and verify
        const channel = await YellowService.getChannel(channel_id);

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found',
            });
        }

        // Verify the address is part of this channel
        if (channel.agentA.toLowerCase() !== address.toLowerCase() &&
            channel.agentB.toLowerCase() !== address.toLowerCase()) {
            return res.status(403).json({
                success: false,
                error: 'Address is not a participant in this channel',
            });
        }

        console.log(`[Wallet] Settlement callback received for channel ${channel_id}, tx: ${tx_hash}`);

        // Actually update the channel status to settled
        channel.status = 'settled';
        channel.settleTxHash = tx_hash;
        channel.updatedAt = new Date();

        // Update channel in YellowService
        await YellowService.updateChannel(channel_id, channel);

        res.json({
            success: true,
            data: {
                channel_id,
                tx_hash,
                status: 'settled',
                message: 'Settlement recorded successfully',
            },
        });
    } catch (error) {
        console.error('[Wallet Route] Settle callback error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process settlement callback',
        });
    }
});

// GET /api/wallet/:address/spending - Get spending summary
router.get('/:address/spending', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;

        // Get user channels
        const channels = await WalletService.getUserChannels(address);

        // Calculate spending from channel balances
        let totalSpent = 0;
        const channelSummaries = [];

        for (const channel of channels) {
            const fullChannel = await YellowService.getChannel(channel.channelId);
            if (fullChannel) {
                // Calculate how much was spent (difference from initial balance)
                const isAgentA = fullChannel.agentA.toLowerCase() === address.toLowerCase();
                const currentBalance = isAgentA ? fullChannel.balanceA : fullChannel.balanceB;

                channelSummaries.push({
                    channelId: channel.channelId,
                    partnerAddress: isAgentA ? fullChannel.agentB : fullChannel.agentA,
                    currentBalance: currentBalance.toString(),
                    status: fullChannel.status,
                    transactionCount: fullChannel.nonce,
                });
            }
        }

        // Get transactions to calculate per-service spending
        const transactions = await YellowService.getTransactions();
        const userTransactions = transactions.filter(
            tx => tx.from.toLowerCase() === address.toLowerCase()
        );

        totalSpent = userTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        res.json({
            success: true,
            data: {
                address,
                totalSpentWei: totalSpent.toString(),
                totalSpentEth: (totalSpent / 1e18).toFixed(6),
                transactionCount: userTransactions.length,
                channels: channelSummaries,
                recentTransactions: userTransactions.slice(-10),
            },
        });
    } catch (error) {
        console.error('[Wallet Route] Spending error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get spending summary',
        });
    }
});

// GET /api/wallet/:address - Get wallet info
router.get('/:address', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;

        const walletInfo = WalletService.getWalletInfo(address);

        if (!walletInfo) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found',
            });
        }

        res.json({
            success: true,
            data: walletInfo,
        });
    } catch (error) {
        console.error('[Wallet Route] Wallet info error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch wallet info',
        });
    }
});

// Callback to record client-side settlement
router.post('/:address/settle-callback', async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        const { channel_id, tx_hash, open_tx_hash, settle_tx_hash, created_at, updated_at } = req.body;

        if (!channel_id || !tx_hash) {
            res.status(400).json({
                success: false,
                error: 'channel_id and tx_hash are required',
            } as ApiResponse<null>);
            return;
        }

        // In a real app, we would verify the tx on-chain here using the provider
        console.log(`[Wallet] Settlement reported by client ${address} for channel ${channel_id}: ${tx_hash}`);

        // We need to update the channel status in YellowService (or database)
        // Since YellowService stores channels in memory by channelId, we can update it directly
        // Note: Ideally WalletService should abstract this, but for demo speed we'll use YellowService's map via a helper or direct access if possible.
        // Let's assume we can update it via WalletService or just trust the client for this demo.

        // Simulating backend update
        const channel = await YellowService.getChannel(channel_id);
        if (channel) {
            // TS hack to update readonly/private if needed, or just update the object ref
            (channel as any).status = 'settled';
            (channel as any).settleTxHash = tx_hash;
            (channel as any).updatedAt = new Date();
            console.log(`[Wallet] Channel ${channel_id} marked as settled via client callback`);
        } else {
            console.log(`[Wallet] Warning: Channel ${channel_id} not found in memory during callback`);
        }

        res.json({
            success: true,
            data: { success: true }
        });

    } catch (error) {
        console.error('Error in settlement callback:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process settlement callback',
        } as ApiResponse<null>);
    }
});

export default router;
