// ============================================
// Service & Pricing Types
// ============================================

export type ServiceType = 'translation' | 'image_gen' | 'scraper' | 'summarizer' | 'orchestrator' | 'pdf_loader' | 'research' | 'coding' | 'data_analysis' | 'security' | 'copywriting' | 'marketing';

export interface Service {
  type: ServiceType;
  description: string;
  inputSchema?: Record<string, string>;
  outputSchema?: Record<string, string>;
}

export interface Pricing {
  serviceType: ServiceType;
  priceUsdc: number;
  unit?: string;
}

// ============================================
// Agent Types
// ============================================

export interface Agent {
  id: string;
  wallet: string;
  privateKey?: string; // Only returned on registration
  services: Service[];
  pricing: Pricing[];
  reputation: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterAgentRequest {
  services: Service[];
  pricing: Pricing[];
}

export interface RegisterAgentResponse {
  success: boolean;
  data: Agent;
}

export interface GetAgentsResponse {
  success: boolean;
  data: Agent[];
}

export interface GetAgentResponse {
  success: boolean;
  data: Agent;
}

export interface ExecuteServiceRequest {
  service_type: ServiceType;
  input: Record<string, unknown>;
}

export interface ExecuteServiceResponse {
  success: boolean;
  data: {
    success: boolean;
    output: unknown;
    cost: number;
    duration: number;
  };
}

export interface UpdateReputationRequest {
  delta: number;
}

// ============================================
// Workflow Types
// ============================================

export interface WorkflowStep {
  serviceType: ServiceType;
  input?: Record<string, unknown>;
  agentWallet?: string;
}

export interface WorkflowStepResult {
  step: number;
  serviceType: ServiceType;
  agentWallet: string;
  input: Record<string, unknown>;
  output: unknown;
  cost: number;
  duration: number;
  paymentTxId: string;
}

export interface ExecuteWorkflowRequest {
  orchestratorWallet: string;
  steps: WorkflowStep[];
  channelId?: string;
  userWallet?: string;
}

export interface WorkflowResult {
  success: boolean;
  steps: WorkflowStepResult[];
  totalCost: number;
  totalDuration: number;
  revenueDistribution?: {
    participants: { wallet: string; share: number; payment: number }[];
  };
  settlement?: {
    autoSettled: boolean;
    channelId: string;
    status: string;
    txHash?: string;
    explorerUrl?: string;
    error?: string;
  };
  error?: string;
}

export interface ExecuteWorkflowResponse {
  success: boolean;
  data: WorkflowResult;
  error?: string;
}

export interface PricingComparison {
  wallet: string;
  price: number;
  reputation: number;
  active: boolean;
}

export interface GetPricingResponse {
  success: boolean;
  data: PricingComparison[];
}

// ============================================
// Payment Channel Types
// ============================================

export interface OpenChannelRequest {
  agent_a: string;
  agent_b: string;
  balance_a: string; // wei (18 decimals)
  balance_b: string; // wei (18 decimals)
}

// OpenChannelRequest removed duplicates

export interface OpenChannelResponse {
  success: boolean;
  data: {
    channel_id: string;
    session_id: string;
  };
}

export interface PaymentChannel {
  channelId: string;
  agentA: string;
  agentB: string;
  balanceA: number;
  balanceB: number;
  nonce: number;
  status: 'open' | 'closed' | 'settling' | 'settled';
  openTxHash: string;
  settleTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetChannelResponse {
  success: boolean;
  data: PaymentChannel;
}

export interface TransferRequest {
  channel_id: string;
  from: string;
  to: string;
  amount: string; // wei
}

export interface ChannelState {
  channelId: string;
  nonce: number;
  balances: Record<string, number>;
  timestamp: number;
}

export interface TransferResponse {
  success: boolean;
  data: {
    new_state: ChannelState;
    transaction: Transaction;
    gas_cost: number;
  };
}

export interface SettleChannelRequest {
  channel_id: string;
}

export interface SettleChannelResponse {
  success: boolean;
  data: {
    tx_hash: string;
    final_state: ChannelState;
  };
}

// ============================================
// Transaction Types
// ============================================

export interface ClientSettleResponse {
  success: boolean;
  data: {
    requires_signing: boolean;
    tx_data: {
      to: string;
      data: string;
      value: string;
      chainId: number;
    };
    channel_id?: string;
    message: string;
  };
}

export interface Transaction {
  id: string;
  fromWallet?: string;
  toWallet?: string;
  amount: number;
  serviceType?: ServiceType;
  channelId?: string;
  stateNonce?: number;
  gasCost: number;
  status?: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

export interface GetTransactionsResponse {
  success: boolean;
  data: Transaction[];
}

// ============================================
// Analytics Types
// ============================================

export interface GasSavings {
  totalTransactions: number;
  onChainCostUsd: number;
  yellowCostUsd: number;
  savingsUsd: number;
  savingsPercent: number;
  lastUpdated: string;
}

export interface GetSavingsResponse {
  success: boolean;
  data: GasSavings;
}

// ============================================
// Health Check Types
// ============================================

export interface HealthResponse {
  status: string;
  timestamp: string;
}

// ============================================
// Wallet Types
// ============================================

export interface WalletConnectRequest {
  address: string;
  signature: string;
  message: string;
}

export interface WalletConnectResponse {
  success: boolean;
  data: {
    address: string;
    verified: boolean;
    balances: {
      eth: string;
      ethWei: string;
    };
  };
}

export interface WalletBalanceResponse {
  success: boolean;
  data: {
    address: string;
    eth: string;
    ethWei: string;
  };
}

export interface DepositRequest {
  amount: string; // wei (string for large numbers)
  txHash: string;
  token?: string;
}

export interface DepositResponse {
  success: boolean;
  data: {
    depositId: string;
    amount: number;
    txHash: string;
    confirmed: boolean;
    timestamp: string;
  };
}

export interface WalletChannel {
  channelId: string;
  partnerAddress: string;
  balance: number;
  status: string;
}

export interface WalletChannelsResponse {
  success: boolean;
  data: {
    address: string;
    channels: WalletChannel[];
    count: number;
  };
}

export interface FundChannelRequest {
  amount: string;
  partnerAddress?: string;
  private_key?: string;
}

export interface FundChannelResponse {
  success: boolean;
  data: {
    sessionId: string;
    channelId: string;
    balance: number;
    status: string;
  };
}

export interface WalletSettleRequest {
  channel_id: string;
  private_key: string;
}

export interface WalletSettleResponse {
  success: boolean;
  data: {
    channel_id: string;
    status: string;
    tx_hash: string;
    final_balances: Record<string, number>;
    settlement_result?: unknown;
    message: string;
  };
}

export interface OnChainSettleResponse {
  success: boolean;
  data: {
    tx_hash: string;
    block_number: number;
    gas_used: string;
    explorer_url: string;
    chain: string;
    message: string;
  };
}

export interface WalletDepositsResponse {
  success: boolean;
  data: {
    address: string;
    deposits: Array<{
      id: string;
      amount: number;
      txHash: string;
      confirmed: boolean;
      timestamp: string;
    }>;
    count: number;
  };
}

export interface WalletInfoResponse {
  success: boolean;
  data: {
    address: string;
    balances: {
      eth: string;
      ethWei: string;
    };
    deposits: unknown[];
    channels: unknown[];
  };
}

// ============================================
// Spending Summary Types
// ============================================

export interface SpendingSummary {
  totalSpent: number;
  totalChannelsFunded: number;
  channelBreakdown: {
    channelId: string;
    partnerAddress: string;
    spent: number;
    remaining: number;
  }[];
  transactionCount: number;
}

// ============================================
// Error Response Type
// ============================================

export interface ErrorResponse {
  success: false;
  error: string;
}