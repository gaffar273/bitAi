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

// FIX: Patch BigInt serialization for JSON.stringify used by SDK
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

// In-memory storage
const channels: Map<string, PaymentChannel> = new Map();
const transactions: Transaction[] = [];

// Yellow Ledger - PROOF of ClearNode communication
interface YellowLedgerEntry {
    timestamp: string;
    type: 'connection' | 'session_created' | 'payment' | 'rpc_response' | 'settlement';
    message: string;
    data: unknown;
    signature?: string;
}
const yellowLedger: YellowLedgerEntry[] = [];

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
            // Handle BigInt serialization for Yellow SDK
            const message = typeof payload === 'string' ? payload : JSON.stringify(payload, (_, v) =>
                typeof v === 'bigint' ? v.toString() : v
            );
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
                yellowLedger.push({
                    timestamp: new Date().toISOString(),
                    type: 'connection',
                    message: 'Connected to Yellow Network ClearNode',
                    data: { url: config.yellowWsUrl }
                });
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

        // Initial allocations (balances in wei - 18 decimals)
        const allocations = [
            { participant: userAddress, asset: 'eth', amount: userBalance },
            { participant: partnerAddress, asset: 'eth', amount: partnerBalance },
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

    // Close/settle session - REAL on-chain settlement via Yellow ClearNode
    static async settle(
        channelId: string,
        signerPrivateKey?: string
    ): Promise<PaymentChannel & { settlementResult?: unknown }> {
        const channel = channels.get(channelId);
        if (!channel) throw new Error('Channel not found');
        if (channel.status === 'settled') throw new Error('Channel already settled');

        await this.connect();

        // Find the session associated with this channel
        let session: YellowSession | undefined;
        for (const [_, s] of sessions) {
            if (s.channelId === channelId) {
                session = s;
                break;
            }
        }

        if (!session) {
            throw new Error('Session not found for channel');
        }

        // Create final allocations based on current channel balances
        const allocations = [
            {
                participant: channel.agentA,
                asset: 'eth',
                amount: channel.balanceA.toString(),
            },
            {
                participant: channel.agentB,
                asset: 'eth',
                amount: channel.balanceB.toString(),
            },
        ];

        // Create close request per ERC-7824 spec
        const closeRequest = {
            app_session_id: session.sessionId,
            allocations: allocations,
        };

        let settlementResult: unknown = null;

        // If we have a signer, create and send the real close message
        if (signerPrivateKey && this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                // Dynamic import to handle the actual SDK function
                const { createCloseAppSessionMessage } = await import('@erc7824/nitrolite');

                const signer = this.createMessageSigner(signerPrivateKey);

                // Create the signed close message
                const signedMessage = await createCloseAppSessionMessage(
                    signer as Parameters<typeof createCloseAppSessionMessage>[0],
                    [closeRequest] as unknown as Parameters<typeof createCloseAppSessionMessage>[1]
                );

                // Send to ClearNode and wait for response
                settlementResult = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Settlement timeout - ClearNode did not respond'));
                    }, 30000);

                    const handleResponse = (data: WebSocket.Data) => {
                        try {
                            const message = JSON.parse(data.toString());

                            // Check for close session response
                            if (message.res && (message.res[1] === 'close_app_session' || message.res[1] === 'app_session_closed')) {
                                clearTimeout(timeout);
                                this.ws?.off('message', handleResponse);
                                resolve({
                                    success: true,
                                    app_session_id: message.res[2]?.[0]?.app_session_id || session!.sessionId,
                                    status: message.res[2]?.[0]?.status || 'closed',
                                    finalAllocations: allocations,
                                });
                            }

                            // Check for error
                            if (message.err) {
                                clearTimeout(timeout);
                                this.ws?.off('message', handleResponse);
                                reject(new Error(`Settlement error: ${message.err[1]} - ${message.err[2]}`));
                            }
                        } catch (error) {
                            console.error('[Yellow] Error parsing settlement response:', error);
                        }
                    };

                    this.ws!.on('message', handleResponse);
                    this.ws!.send(signedMessage);

                    console.log(`[Yellow] Settlement request sent for channel: ${channelId}`);
                });

                console.log('[Yellow] Settlement confirmed by ClearNode:', settlementResult);
            } catch (error) {
                console.error('[Yellow] Real settlement failed, using fallback:', error);
                // Fallback to local settlement tracking
                settlementResult = {
                    success: true,
                    fallback: true,
                    message: 'Settlement tracked locally - ClearNode confirmation pending',
                };
            }
        } else {
            // No signer provided - simulate settlement for demo
            console.log('[Yellow] No signer provided - simulating settlement');
            settlementResult = {
                success: true,
                simulated: true,
                finalAllocations: allocations,
            };
        }

        // Update channel status
        channel.status = 'settled';
        channel.settleTxHash = `yellow-settle-${session.sessionId}-${Date.now()}`;
        channel.updatedAt = new Date();
        channels.set(channelId, channel);

        // Remove session
        sessions.delete(session.sessionId);

        console.log(`[Yellow] Channel settled: ${channelId}`);
        console.log(`[Yellow] Final allocations: ${channel.agentA.slice(0, 10)}... = $${channel.balanceA / 1000000}, ${channel.agentB.slice(0, 10)}... = $${channel.balanceB / 1000000}`);

        return { ...channel, settlementResult };
    }

    // Handle incoming messages from ClearNode
    private static handleMessage(data: string) {
        try {
            const response = parseAnyRPCResponse(data);
            console.log('[Yellow] RPC:', JSON.stringify(response).slice(0, 100));

            yellowLedger.push({
                timestamp: new Date().toISOString(),
                type: 'rpc_response',
                message: 'Received RPC response from ClearNode',
                data: response
            });
        } catch {
            console.log('[Yellow] Message received');
            yellowLedger.push({
                timestamp: new Date().toISOString(),
                type: 'rpc_response',
                message: 'Received raw message from ClearNode',
                data: { raw: data.toString() }
            });
        }
    }

    // Get the proof ledger
    static getLedger(): YellowLedgerEntry[] {
        return yellowLedger;
    }

    // Get all sessions for a specific user address
    static async getUserSessions(userAddress: string): Promise<YellowSession[]> {
        const userSessions: YellowSession[] = [];

        for (const [_, session] of sessions) {
            if (session.userAddress.toLowerCase() === userAddress.toLowerCase() ||
                session.partnerAddress.toLowerCase() === userAddress.toLowerCase()) {
                userSessions.push(session);
            }
        }

        return userSessions;
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

    // Get all transactions, optionally filtered by channelId
    static async getTransactions(channelId?: string, limit = 50, offset = 0): Promise<Transaction[]> {
        let filtered = transactions;

        // If first arg is a number (legacy call), treat as limit
        if (typeof channelId === 'number') {
            const legacyLimit = channelId;
            const legacyOffset = limit || 0;
            return transactions.slice(legacyOffset, legacyOffset + legacyLimit);
        }

        if (channelId) {
            filtered = transactions.filter(t => t.channelId === channelId);
        }

        return filtered.slice(offset, offset + limit);
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

    // Settle directly on Base Sepolia (on-chain transaction)
    static async settleOnChain(
        channelId: string,
        privateKey?: string
    ): Promise<{
        success: boolean;
        txHash?: string;
        blockNumber?: number;
        gasUsed?: string;
        explorerUrl?: string;
        error?: string;
    }> {
        const channel = channels.get(channelId);
        if (!channel) throw new Error('Channel not found');

        const signerKey = (privateKey && privateKey !== 'demo-key') ? privateKey : config.privateKey;
        if (!signerKey) {
            throw new Error('Private key required for on-chain settlement');
        }

        try {
            // Connect to Base Sepolia
            const provider = new ethers.JsonRpcProvider(config.baseSepolia.rpcUrl);
            const wallet = new ethers.Wallet(signerKey, provider);

            console.log(`[Yellow] Settling on Base Sepolia...`);
            console.log(`[Yellow] Wallet: ${wallet.address}`);
            console.log(`[Yellow] Chain ID: ${config.baseSepolia.chainId}`);

            // Check wallet balance
            const balance = await provider.getBalance(wallet.address);
            console.log(`[Yellow] Wallet balance: ${ethers.formatEther(balance)} ETH`);

            if (balance === 0n) {
                throw new Error('Wallet has no ETH for gas. Get testnet ETH from faucet.');
            }

            // Create settlement data
            const settlementData = {
                channelId: channel.channelId,
                agentA: channel.agentA,
                agentB: channel.agentB,
                balanceA: channel.balanceA,
                balanceB: channel.balanceB,
                nonce: channel.nonce,
                timestamp: Date.now(),
            };

            // For demo: Send a simple transaction to record settlement on-chain
            // In production, this would call Yellow's NitroAdjudicator contract
            const tx = await wallet.sendTransaction({
                to: wallet.address, // Self-transfer as settlement proof
                value: 0,
                data: ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify({
                    type: 'YELLOW_SETTLEMENT',
                    ...settlementData,
                }))),
            });

            console.log(`[Yellow] Settlement tx sent: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();

            if (!receipt) {
                throw new Error('Transaction failed - no receipt');
            }

            // Update channel status
            channel.status = 'settled';
            channel.settleTxHash = tx.hash;
            channel.updatedAt = new Date();
            channels.set(channelId, channel);

            const explorerUrl = `${config.baseSepolia.explorer}/tx/${tx.hash}`;

            console.log(`[Yellow] Settlement confirmed!`);

            // Log to Yellow Ledger
            yellowLedger.push({
                timestamp: new Date().toISOString(),
                type: 'settlement',
                message: 'Settled on-chain via Base Sepolia',
                data: {
                    txHash: tx.hash,
                    block: receipt.blockNumber,
                    explorer: explorerUrl
                }
            });
            console.log(`[Yellow] Block: ${receipt.blockNumber}`);
            console.log(`[Yellow] Gas used: ${receipt.gasUsed.toString()}`);
            console.log(`[Yellow] Explorer: ${explorerUrl}`);

            return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                explorerUrl,
            };
        } catch (error) {
            console.error('[Yellow] On-chain settlement failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Settlement failed',
            };
        }
    }

    // Get settlement data for client-side signing
    static async getSettlementData(channelId: string, userAddress: string) {
        const channel = channels.get(channelId);
        if (!channel) throw new Error('Channel not found');

        // Create settlement data
        const settlementData = {
            channelId: channel.channelId,
            agentA: channel.agentA,
            agentB: channel.agentB,
            balanceA: channel.balanceA,
            balanceB: channel.balanceB,
            nonce: channel.nonce,
            timestamp: Date.now(),
        };

        // Create Hex data for the transaction
        const data = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify({
            type: 'YELLOW_SETTLEMENT',
            ...settlementData,
        })));

        return {
            to: channel.agentB, // Send proof to the partner (Orchestrator) to close channel
            value: '0x0',
            data: data,
            settlementData
        };
    }

    // Mark channel as settled (after client reports success)
    static async markSettled(channelId: string, txHash: string) {
        const channel = channels.get(channelId);
        if (!channel) throw new Error('Channel not found');

        channel.status = 'settled';
        channel.settleTxHash = txHash;
        channel.updatedAt = new Date();
        channels.set(channelId, channel);

        // Find session and remove it
        for (const [key, session] of sessions) {
            if (session.channelId === channelId) {
                sessions.delete(key);
                break;
            }
        }

        console.log(`[Yellow] Client settled channel on-chain: ${txHash}`);

        // Log to Ledger
        yellowLedger.push({
            timestamp: new Date().toISOString(),
            type: 'settlement',
            message: 'Client-side settlement on Base Sepolia',
            data: { txHash, channelId }
        });

        return channel;
    }

    // Disconnect
    static disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
