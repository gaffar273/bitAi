// Agent Message Types - All agent communication uses these formats

export interface AgentMessage {
    id: string;
    type: 'service_request' | 'service_response' | 'payment_request' | 'payment_confirm';
    from: string;
    to: string;
    timestamp: number;
    payload: ServicePayload | PaymentPayload;
    signature: string;
}

export interface ServicePayload {
    serviceType: 'translation' | 'image_gen' | 'scraper' | 'summarizer';
    input: unknown;
    output?: unknown;
    priceUsdc: number;
    status: 'pending' | 'completed' | 'failed';
}

export interface PaymentPayload {
    amountUsdc: number;
    channelId: string;
    stateNonce: number;
    txHash?: string;
}

// Agent Registry Types
export interface Agent {
    id: string;
    wallet: string;
    services: ServiceDef[];
    pricing: PricingDef[];
    reputation: number;
    active: boolean;
    createdAt: Date;
}

export interface ServiceDef {
    type: 'translation' | 'image_gen' | 'scraper' | 'summarizer';
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
}

export interface PricingDef {
    serviceType: string;
    priceUsdc: number;
    unit: string; // e.g., "per 100 words", "per image", "per page"
}

// Payment Channel Types
export interface PaymentChannel {
    channelId: string;
    agentA: string;
    agentB: string;
    balanceA: number;
    balanceB: number;
    nonce: number;
    status: 'open' | 'pending_settlement' | 'settled' | 'disputed';
    openTxHash: string;
    settleTxHash?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface StateUpdate {
    channelId: string;
    nonce: number;
    balances: {
        [address: string]: number;
    };
    timestamp: number;
    signatureA?: string;
    signatureB?: string;
}

// Transaction Types
export interface Transaction {
    id: string;
    channelId: string;
    from: string;
    to: string;
    amount: number;
    serviceType?: string;
    stateNonce: number;
    createdAt: Date;
}

// Analytics Types
export interface SavingsMetrics {
    totalTransactions: number;
    onChainCostUsd: number;
    yellowCostUsd: number;
    savingsUsd: number;
    savingsPercent: number;
    gasPriceGwei: number;
    ethPriceUsd: number;
    lastUpdated: Date;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
