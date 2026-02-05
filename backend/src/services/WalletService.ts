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

    // Get ETH + USDC balances on Base Sepolia
    static async getBalances(address: string): Promise<{
        address: string;
        eth: string;
        usdc: string;
        usdcRaw: string;
    }> {
        try {
            const provider = new ethers.JsonRpcProvider(config.baseSepolia.rpcUrl);

            // Get ETH balance
            const ethBalance = await provider.getBalance(address);
            const ethFormatted = ethers.formatEther(ethBalance);

            // Get USDC balance (ERC-20)
            const usdcAddress = config.usdcContract;
            const usdcAbi = [
                'function balanceOf(address account) view returns (uint256)',
                'function decimals() view returns (uint8)',
            ];

            const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
            const usdcBalance = await usdcContract.balanceOf(address);
            const decimals = await usdcContract.decimals();
            const usdcFormatted = ethers.formatUnits(usdcBalance, decimals);

            console.log(`[Wallet] Balances for ${address}: ${ethFormatted} ETH, ${usdcFormatted} USDC`);

            return {
                address,
                eth: ethFormatted,
                usdc: usdcFormatted,
                usdcRaw: usdcBalance.toString(),
            };
        } catch (error) {
            console.error('[Wallet] Error fetching balances:', error);
            throw new Error('Failed to fetch balances');
        }
    }

    // Track USDC deposit
    static async trackDeposit(
        walletAddress: string,
        amount: string,
        txHash: string,
        token: string = 'USDC'
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

        return sessions.map(session => ({
            sessionId: session.sessionId,
            channelId: session.channelId,
            userAddress: session.userAddress,
            partnerAddress: session.partnerAddress,
            status: session.status,
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
            // Convert USDC amount to micro-USDC (6 decimals)
            const amountFloat = parseFloat(amount);
            const microUsdc = Math.floor(amountFloat * 1_000_000).toString();

            console.log(`[Wallet] Creating Yellow channel: ${userAddress} -> ${partnerAddress}, amount: ${microUsdc} micro-USDC`);

            // Use client's private key if provided, otherwise fallback to system key for demo
            const signerKey = privateKey || config.privateKey;

            // Create Yellow session
            const { sessionId, channelId } = await YellowService.createSession(
                userAddress,
                partnerAddress,
                microUsdc,
                '0', // Partner starts with 0
                signerKey
            );

            console.log(`[Wallet] Channel created: ${channelId}`);

            return {
                sessionId,
                channelId,
                userBalance: microUsdc,
                status: 'open',
            };
        } catch (error) {
            console.error('[Wallet] Error funding channel:', error);
            throw new Error('Failed to fund channel');
        }
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
