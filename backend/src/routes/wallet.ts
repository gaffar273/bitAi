import { Router, Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { YellowService } from '../services/YellowService';

const router = Router();

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
                    usdc: balances.usdc,
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

// POST /api/wallet/:address/deposit - Record USDC deposit
router.post('/:address/deposit', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;
        const { amount, txHash, token = 'USDC' } = req.body;

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

export default router;
