// ============================================
// Service & Pricing Types
// ============================================

export type ServiceType = 'translation' | 'image_gen' | 'scraper' | 'summarizer' | 'orchestrator';

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
  input: any;
}

export interface ExecuteServiceResponse {
  success: boolean;
  data: {
    success: boolean;
    output: any;
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
  input?: any;
  agentWallet?: string;
}

export interface WorkflowStepResult {
  step: number;
  serviceType: ServiceType;
  agentWallet: string;
  input: any;
  output: any;
  cost: number;
  duration: number;
  paymentTxId: string;
}

export interface ExecuteWorkflowRequest {
  orchestratorWallet: string;
  steps: WorkflowStep[];
  channelId?: string;
}

export interface WorkflowResult {
  success: boolean;
  steps: WorkflowStepResult[];
  totalCost: number;
  totalDuration: number;
}

export interface ExecuteWorkflowResponse {
  success: boolean;
  data: WorkflowResult;
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
  balance_a: string; // micro-USDC (6 decimals)
  balance_b: string; // micro-USDC (6 decimals)
}

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
  status: 'open' | 'closed' | 'settling';
  openTxHash: string;
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
  amount: string; // micro-USDC
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
      usdc: string;
    };
  };
}

export interface WalletBalanceResponse {
  success: boolean;
  data: {
    eth: string;
    usdc: string;
  };
}

export interface DepositRequest {
  amount: number;
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
  amount: number;
  partnerAddress?: string;
  private_key?: string;
}

export interface FundChannelResponse {
  success: boolean;
  data: {
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
    settlement_result?: any;
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
      usdc: string;
    };
    deposits: any[];
    channels: any[];
  };
}

// ============================================
// Error Response Type
// ============================================

export interface ErrorResponse {
  success: false;
  error: string;
}