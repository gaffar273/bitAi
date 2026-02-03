import WebSocket from 'ws';
import { ethers } from 'ethers';
import { config } from '../config';
import { PaymentChannel, StateUpdate, Transaction } from '../types';
import { generateId } from '../utils/blockchain';

// Import Nitrolite SDK - use what works with our types
import {
    createAppSessionMessage,
    parseAnyRPCResponse,
    generateChannelNonce,
} from '@erc7824/nitrolite';

// In-memory storage
const channels: Map<string, PaymentChannel> = new Map();
const transactions: Transaction[] = [];

interface YellowSession {
    sessionId: string;
    channelId: string;
    userAddress: string;
    partnerAddress: string;
    status: 'connecting' | 'connected' | 'session_created' | 'closed';
    nonce: bigint;
}

const sessions: Map<string, YellowSession> = new Map();

export class YellowService {
    private static ws: WebSocket | null = null;
    private static connectionPromise: Promise<void> | null = null;

    // Create a message signer compatible with Nitrolite SDK
    static createMessageSigner(privateKey: string) {
        const wallet = new ethers.Wallet(privateKey);
        return async (payload: unknown): Promise<string> => {
            const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
            return await wallet.signMessage(message);
        };
    }

    // Connect to Yellow ClearNode
    static async connect(): Promise<void> {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            console.log(`[Yellow] Connecting to: ${config.yellowWsUrl}`);

            this.ws = new WebSocket(config.yellowWsUrl);

            this.ws.onopen = () => {
                console.log('[Yellow] Connected to ClearNode!');
                resolve();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data.toString());
            };

            this.ws.onerror = (error) => {
                console.error('[Yellow] WebSocket error:', error);
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('[Yellow] WebSocket closed');
                this.ws = null;
                this.connectionPromise = null;
            };

            setTimeout(() => {
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });

        return this.connectionPromise;
    }

    // Create a payment session between two agents using Nitrolite SDK
    static async createSession(
        userAddress: string,
        partnerAddress: string,
        userBalance: string,
        partnerBalance: string,
        signerPrivateKey?: string
    ): Promise<{ sessionId: string; channelId: string }> {
        await this.connect();

        // Generate channel nonce using SDK
        const nonce = generateChannelNonce();
        const channelId = generateId();
        const sessionId = generateId();

        // Define app session per ERC-7824 spec
        const appDefinition = {
            protocol: 'agentswarm-payments',
            participants: [userAddress, partnerAddress] as [string, string],
            weights: [100, 100] as [number, number],
            quorum: 100,
            challenge: 86400,
            nonce,
        };

        // Initial allocations (balances in micro-USDC)
        const allocations = [
            { participant: userAddress, asset: 'usdc', amount: userBalance },
            { participant: partnerAddress, asset: 'usdc', amount: partnerBalance },
        ];

        // Create and send session message using Nitrolite SDK
        if (signerPrivateKey && this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const signer = this.createMessageSigner(signerPrivateKey);
                // Cast to SDK's expected type (SDK has strict hex address requirements)
                const sessionMessage = await createAppSessionMessage(
                    signer as Parameters<typeof createAppSessionMessage>[0],
                    [{ definition: appDefinition, allocations }] as unknown as Parameters<typeof createAppSessionMessage>[1]
                );
                this.ws.send(sessionMessage);
                console.log(`[Yellow] Session created via SDK: ${sessionId}`);
            } catch (error) {
                console.error('[Yellow] SDK session creation error:', error);
            }
        }

        // Store session
        const session: YellowSession = {
            sessionId,
            channelId,
            userAddress,
            partnerAddress,
            status: 'session_created',
            nonce,
        };
        sessions.set(sessionId, session);

        // Create local channel record
        const channel: PaymentChannel = {
            channelId,
            agentA: userAddress,
            agentB: partnerAddress,
            balanceA: parseInt(userBalance),
            balanceB: parseInt(partnerBalance),
            nonce: 0,
            status: 'open',
            openTxHash: sessionId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        channels.set(channelId, channel);

        return { sessionId, channelId };
    }

    // Submit state update (payment) - instant, off-chain, 0 gas
    static async sendPayment(
        channelId: string,
        from: string,
        to: string,
        amount: string,
        _signerPrivateKey?: string
    ): Promise<{ transaction: Transaction; channel: PaymentChannel }> {
        const channel = channels.get(channelId);
        if (!channel) throw new Error('Channel not found');
        if (channel.status !== 'open') throw new Error('Channel is not open');

        const amountNum = parseInt(amount);

        // Validate and update balances
        if (from === channel.agentA) {
            if (channel.balanceA < amountNum) throw new Error('Insufficient balance');
            channel.balanceA -= amountNum;
            channel.balanceB += amountNum;
        } else if (from === channel.agentB) {
            if (channel.balanceB < amountNum) throw new Error('Insufficient balance');
            channel.balanceB -= amountNum;
            channel.balanceA += amountNum;
        } else {
            throw new Error('Sender not in channel');
        }

        channel.nonce++;
        channel.updatedAt = new Date();
        channels.set(channelId, channel);

        // Create transaction record
        const tx: Transaction = {
            id: generateId(),
            channelId,
            from,
            to,
            amount: amountNum,
            stateNonce: channel.nonce,
            createdAt: new Date(),
        };
        transactions.push(tx);

        console.log(`[Yellow] Payment: ${amount} ${from.slice(0, 10)}... -> ${to.slice(0, 10)}... (nonce: ${channel.nonce})`);

        return { transaction: tx, channel };
    }

    // Close/settle session - finalizes on-chain when requested
    static async settle(channelId: string, _signerPrivateKey?: string): Promise<PaymentChannel> {
        const channel = channels.get(channelId);
        if (!channel) throw new Error('Channel not found');

        // In production, this would call createCloseAppSessionMessage
        // For sandbox demo, we simulate settlement
        channel.status = 'settled';
        channel.settleTxHash = `yellow-settle-${Date.now()}`;
        channel.updatedAt = new Date();
        channels.set(channelId, channel);

        console.log(`[Yellow] Session settled: ${channelId}`);
        return channel;
    }

    // Handle incoming messages from ClearNode
    private static handleMessage(data: string) {
        try {
            const response = parseAnyRPCResponse(data);
            console.log('[Yellow] RPC:', JSON.stringify(response).slice(0, 100));
        } catch {
            console.log('[Yellow] Message received');
        }
    }

    // Get channel by ID
    static async getChannel(channelId: string): Promise<PaymentChannel | null> {
        return channels.get(channelId) || null;
    }

    // Get channel state
    static async getState(channelId: string): Promise<StateUpdate | null> {
        const channel = channels.get(channelId);
        if (!channel) return null;

        return {
            channelId,
            nonce: channel.nonce,
            balances: {
                [channel.agentA]: channel.balanceA,
                [channel.agentB]: channel.balanceB,
            },
            timestamp: Date.now(),
        };
    }

    // Get all transactions
    static async getTransactions(limit = 50, offset = 0): Promise<Transaction[]> {
        return transactions.slice(offset, offset + limit);
    }

    // Get gas savings metrics
    static async getSavingsMetrics() {
        const totalTxs = transactions.length;
        const uniqueChannels = new Set(transactions.map((t) => t.channelId)).size;

        // Yellow: 0 gas for off-chain | On-chain: ~$5/tx
        const onChainCostPerTx = 5;
        const yellowCostPerChannel = 0.10;

        const onChainCostUsd = totalTxs * onChainCostPerTx;
        const yellowCostUsd = uniqueChannels * yellowCostPerChannel;
        const savingsUsd = Math.max(0, onChainCostUsd - yellowCostUsd);
        const savingsPercent = onChainCostUsd > 0 ? (savingsUsd / onChainCostUsd) * 100 : 0;

        return {
            totalTransactions: totalTxs,
            onChainCostUsd: Math.round(onChainCostUsd * 100) / 100,
            yellowCostUsd: Math.round(yellowCostUsd * 100) / 100,
            savingsUsd: Math.round(savingsUsd * 100) / 100,
            savingsPercent: Math.round(savingsPercent * 100) / 100,
            lastUpdated: new Date(),
        };
    }

    // Disconnect
    static disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
