import { ethers } from 'ethers';
import { config } from '../config';
import { YellowService } from './YellowService';

// In-memory wallet tracking
interface WalletInfo {
    address: string;
    verified: boolean;
    registeredAt: Date;
    lastSeen: Date;
}

interface DepositRecord {
    id: string;
    walletAddress: string;
    amount: string;
    txHash: string;
    token: string;
    timestamp: Date;
    confirmed: boolean;
}

const wallets: Map<string, WalletInfo> = new Map();
const deposits: DepositRecord[] = [];

export class WalletService {
    // Verify wallet ownership via signature
    static async verifyWalletSignature(
        address: string,
        signature: string,
        message: string
    ): Promise<{ verified: boolean; error?: string }> {
        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);

            if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                return { verified: false, error: 'Signature verification failed' };
            }

            // Register/update wallet
            const existing = wallets.get(address.toLowerCase());
            if (existing) {
                existing.verified = true;
                existing.lastSeen = new Date();
            } else {
                wallets.set(address.toLowerCase(), {
                    address: address.toLowerCase(),
                    verified: true,
                    registeredAt: new Date(),
                    lastSeen: new Date(),
                });
            }

            console.log(`[Wallet] Verified wallet: ${address}`);
            return { verified: true };
        } catch (error) {
            console.error('[Wallet] Signature verification error:', error);
            return {
                verified: false,
                error: error instanceof Error ? error.message : 'Verification failed'
            };
        }
    }

    // Get ETH balance on Base Sepolia
    static async getBalances(address: string): Promise<{
        address: string;
        eth: string;
        ethWei: string;
    }> {
        try {
            const provider = new ethers.JsonRpcProvider(config.baseSepolia.rpcUrl);

            // Get ETH balance
            const ethBalance = await provider.getBalance(address);
            const ethFormatted = ethers.formatEther(ethBalance);

            console.log(`[Wallet] Balance for ${address}: ${ethFormatted} ETH`);

            return {
                address,
                eth: ethFormatted,
                ethWei: ethBalance.toString(),
            };
        } catch (error) {
            console.error('[Wallet] Error fetching balances:', error);
            throw new Error('Failed to fetch balances');
        }
    }

    // Track ETH deposit
    static async trackDeposit(
        walletAddress: string,
        amount: string,
        txHash: string,
        token: string = 'ETH'
    ): Promise<DepositRecord> {
        const deposit: DepositRecord = {
            id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            walletAddress: walletAddress.toLowerCase(),
            amount,
            txHash,
            token,
            timestamp: new Date(),
            confirmed: true, // In production, verify on-chain
        };

        deposits.push(deposit);
        console.log(`[Wallet] Tracked deposit: ${amount} ${token} for ${walletAddress}`);

        return deposit;
    }

    // Get all Yellow channels for a user
    static async getUserChannels(userAddress: string) {
        const sessions = await YellowService.getUserSessions(userAddress);

        return await Promise.all(sessions.map(async session => {
            const channel = await YellowService.getChannel(session.channelId);
            let balance = '0';

            if (channel) {
                // Determine which balance belongs to the user
                if (channel.agentA.toLowerCase() === userAddress.toLowerCase()) {
                    balance = channel.balanceA.toString();
                } else if (channel.agentB.toLowerCase() === userAddress.toLowerCase()) {
                    balance = channel.balanceB.toString();
                }
            }

            return {
                sessionId: session.sessionId,
                channelId: session.channelId,
                userAddress: session.userAddress,
                partnerAddress: session.partnerAddress,
                status: session.status,
                balance: balance,
            };
        }));
    }

    // Fund a Yellow channel from user wallet
    static async fundChannel(
        userAddress: string,
        amount: string,
        partnerAddress: string = config.defaultOrchestratorAddress || '0xOrchestrator',
        privateKey?: string // Client provides their private key for signing
    ): Promise<{
        sessionId: string;
        channelId: string;
        userBalance: string;
        status: string;
    }> {
        try {
            // Convert ETH amount to wei (18 decimals)
            const amountFloat = parseFloat(amount);
            const weiAmount = Math.floor(amountFloat * 1e18).toString();

            console.log(`[Wallet] Creating Yellow channel: ${userAddress} -> ${partnerAddress}, amount: ${weiAmount} wei`);

            // Use client's private key if provided, otherwise fallback to system key for demo
            const signerKey = privateKey || config.privateKey;

            // Create Yellow session
            const { sessionId, channelId } = await YellowService.createSession(
                userAddress,
                partnerAddress,
                weiAmount,
                '0', // Partner starts with 0
                signerKey
            );

            console.log(`[Wallet] Channel created: ${channelId}`);

            return {
                sessionId,
                channelId,
                userBalance: weiAmount,
                status: 'open',
            };
        } catch (error) {
            console.error('[Wallet] Error funding channel:', error);
            throw new Error('Failed to fund channel');
        }
    }


    // Get total spending summary for a wallet
    static async getSpendingSummary(address: string): Promise<{
        totalSpent: number;
        totalChannelsFunded: number;
        channelBreakdown: { channelId: string; partnerAddress: string; spent: number; remaining: number }[];
        transactionCount: number;
    }> {
        const sessions = await YellowService.getUserSessions(address);
        let totalSpent = 0;
        let totalChannelsFunded = 0;
        const channelBreakdown: { channelId: string; partnerAddress: string; spent: number; remaining: number }[] = [];

        for (const session of sessions) {
            const channel = await YellowService.getChannel(session.channelId);
            if (!channel) continue;

            totalChannelsFunded++;
            const isAgentA = channel.agentA.toLowerCase() === address.toLowerCase();
            const currentBalance = isAgentA ? channel.balanceA : channel.balanceB;
            // The other side's balance represents what was paid out
            const otherBalance = isAgentA ? channel.balanceB : channel.balanceA;
            totalSpent += otherBalance;

            channelBreakdown.push({
                channelId: session.channelId,
                partnerAddress: session.partnerAddress,
                spent: otherBalance,
                remaining: currentBalance,
            });
        }

        const allTx = await YellowService.getTransactions(undefined, 1000, 0);
        const userTx = allTx.filter(
            (tx: any) => tx.from?.toLowerCase() === address.toLowerCase()
        );

        return {
            totalSpent,
            totalChannelsFunded,
            channelBreakdown,
            transactionCount: userTx.length,
        };
    }

    // Get wallet info
    static getWalletInfo(address: string): WalletInfo | null {
        return wallets.get(address.toLowerCase()) || null;
    }

    // Get deposits for wallet
    static getDeposits(walletAddress: string): DepositRecord[] {
        return deposits.filter(d => d.walletAddress.toLowerCase() === walletAddress.toLowerCase());
    }

    // Get all registered wallets
    static getAllWallets(): WalletInfo[] {
        return Array.from(wallets.values());
    }
}
