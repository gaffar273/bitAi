import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type {
  // Health
  HealthResponse,
  // Agents
  RegisterAgentRequest,
  RegisterAgentResponse,
  GetAgentsResponse,
  GetAgentResponse,
  ExecuteServiceRequest,
  ExecuteServiceResponse,
  UpdateReputationRequest,
  // Workflows
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
  GetPricingResponse,
  ServiceType,
  // Payments
  OpenChannelRequest,
  OpenChannelResponse,
  GetChannelResponse,
  TransferRequest,
  TransferResponse,
  SettleChannelRequest,
  SettleChannelResponse,
  // Analytics
  GetSavingsResponse,
  GetTransactionsResponse,
  // Wallet
  WalletConnectRequest,
  WalletConnectResponse,
  WalletBalanceResponse,
  DepositRequest,
  DepositResponse,
  WalletChannelsResponse,
  FundChannelRequest,
  FundChannelResponse,
  WalletSettleRequest,
  WalletSettleResponse,
  OnChainSettleResponse,
  WalletDepositsResponse,
  WalletInfoResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ============================================
// API Service
// ============================================

export const api = {
  // ============================================
  // Health Check
  // ============================================

  /**
   * Check if the server is running
   * GET /health
   */
  health: (): Promise<AxiosResponse<HealthResponse>> =>
    axios.get(`${API_BASE}/health`),

  // ============================================
  // Agents
  // ============================================

  /**
   * Register a new AI agent
   * POST /api/agents/register
   */
  registerAgent: (data: RegisterAgentRequest): Promise<AxiosResponse<RegisterAgentResponse>> =>
    axios.post(`${API_BASE}/api/agents/register`, data),

  /**
   * List all active agents, optionally filter by service type
   * GET /api/agents?service_type=translation
   */
  getAgents: (serviceType?: ServiceType): Promise<AxiosResponse<GetAgentsResponse>> =>
    axios.get(`${API_BASE}/api/agents`, {
      params: serviceType ? { service_type: serviceType } : {},
    }),

  /**
   * Get a specific agent by wallet address
   * GET /api/agents/:wallet
   */
  getAgent: (wallet: string): Promise<AxiosResponse<GetAgentResponse>> =>
    axios.get(`${API_BASE}/api/agents/${wallet}`),

  /**
   * Execute a service on an agent (for testing)
   * POST /api/agents/:wallet/execute
   */
  executeService: (
    wallet: string,
    data: ExecuteServiceRequest
  ): Promise<AxiosResponse<ExecuteServiceResponse>> =>
    axios.post(`${API_BASE}/api/agents/${wallet}/execute`, data),

  /**
   * Update agent reputation (admin use)
   * PATCH /api/agents/:wallet/reputation
   */
  updateReputation: (
    wallet: string,
    data: UpdateReputationRequest
  ): Promise<AxiosResponse<{ success: boolean }>> =>
    axios.patch(`${API_BASE}/api/agents/${wallet}/reputation`, data),

  // ============================================
  // Orchestrator (Multi-Agent Workflows)
  // ============================================

  /**
   * Execute a multi-step workflow with automatic agent selection
   * POST /api/orchestrator/workflow
   */
  executeWorkflow: (data: ExecuteWorkflowRequest): Promise<AxiosResponse<ExecuteWorkflowResponse>> =>
    axios.post(`${API_BASE}/api/orchestrator/workflow`, data),

  /**
   * Compare pricing for a service across all available agents
   * GET /api/orchestrator/pricing/:serviceType
   */
  getPricing: (serviceType: ServiceType): Promise<AxiosResponse<GetPricingResponse>> =>
    axios.get(`${API_BASE}/api/orchestrator/pricing/${serviceType}`),

  // ============================================
  // Payments (Yellow State Channels)
  // ============================================

  /**
   * Open a payment channel between two agents
   * POST /api/payments/channel/open
   */
  openChannel: (data: OpenChannelRequest): Promise<AxiosResponse<OpenChannelResponse>> =>
    axios.post(`${API_BASE}/api/payments/channel/open`, data),

  /**
   * Get channel state
   * GET /api/payments/channel/:channelId
   */
  getChannel: (channelId: string): Promise<AxiosResponse<GetChannelResponse>> =>
    axios.get(`${API_BASE}/api/payments/channel/${channelId}`),

  /**
   * Send an instant payment through the channel (0 gas, off-chain)
   * POST /api/payments/transfer
   */
  transfer: (data: TransferRequest): Promise<AxiosResponse<TransferResponse>> =>
    axios.post(`${API_BASE}/api/payments/transfer`, data),

  /**
   * Settle the channel on-chain (batch all transactions)
   * POST /api/payments/settle
   */
  settleChannel: (data: SettleChannelRequest): Promise<AxiosResponse<SettleChannelResponse>> =>
    axios.post(`${API_BASE}/api/payments/settle`, data),

  // ============================================
  // Analytics
  // ============================================

  /**
   * Get gas savings metrics (Yellow vs on-chain)
   * GET /api/analytics/savings
   */
  getSavings: (): Promise<AxiosResponse<GetSavingsResponse>> =>
    axios.get(`${API_BASE}/api/analytics/savings`),

  /**
   * Get transaction history from database
   * GET /api/analytics/transactions?limit=50&offset=0
   */
  getTransactions: (
    limit = 50,
    offset = 0
  ): Promise<AxiosResponse<GetTransactionsResponse>> =>
    axios.get(`${API_BASE}/api/analytics/transactions`, {
      params: { limit, offset },
    }),

  // ============================================
  // Wallet (User Wallet Integration)
  // ============================================

  /**
   * Connect and verify wallet ownership via signature
   * POST /api/wallet/connect
   */
  connectWallet: (data: WalletConnectRequest): Promise<AxiosResponse<WalletConnectResponse>> =>
    axios.post(`${API_BASE}/api/wallet/connect`, data),

  /**
   * Get wallet balances (ETH)
   * GET /api/wallet/:address/balance
   */
  getWalletBalance: (address: string): Promise<AxiosResponse<WalletBalanceResponse>> =>
    axios.get(`${API_BASE}/api/wallet/${address}/balance`),

  /**
   * Record an ETH deposit
   * POST /api/wallet/:address/deposit
   */
  recordDeposit: (
    address: string,
    data: DepositRequest
  ): Promise<AxiosResponse<DepositResponse>> =>
    axios.post(`${API_BASE}/api/wallet/${address}/deposit`, data),

  /**
   * Get active Yellow channels for a wallet
   * GET /api/wallet/:address/channels
   */
  getWalletChannels: (address: string): Promise<AxiosResponse<WalletChannelsResponse>> =>
    axios.get(`${API_BASE}/api/wallet/${address}/channels`),

  /**
   * Create/fund a Yellow channel
   * POST /api/wallet/:address/fund-channel
   */
  fundWalletChannel: (
    address: string,
    data: FundChannelRequest
  ): Promise<AxiosResponse<FundChannelResponse>> =>
    axios.post(`${API_BASE}/api/wallet/${address}/fund-channel`, data),

  /**
   * Settle a channel using client wallet signature
   * POST /api/wallet/:address/settle
   */
  settleWalletChannel: (
    address: string,
    data: WalletSettleRequest
  ): Promise<AxiosResponse<WalletSettleResponse>> =>
    axios.post(`${API_BASE}/api/wallet/${address}/settle`, data),

  /**
   * On-chain settlement using client wallet
   * POST /api/wallet/:address/settle/onchain
   */
  settleWalletOnchain: (
    address: string,
    data: WalletSettleRequest
  ): Promise<AxiosResponse<OnChainSettleResponse>> =>
    axios.post(`${API_BASE}/api/wallet/${address}/settle/onchain`, data),

  /**
   * Get deposit history for a wallet
   * GET /api/wallet/:address/deposits
   */
  getWalletDeposits: (address: string): Promise<AxiosResponse<WalletDepositsResponse>> =>
    axios.get(`${API_BASE}/api/wallet/${address}/deposits`),

  /**
   * Get full wallet info
   * GET /api/wallet/:address
   */
  getWalletInfo: (address: string): Promise<AxiosResponse<WalletInfoResponse>> =>
    axios.get(`${API_BASE}/api/wallet/${address}`),
};

// ============================================
// Utility Functions
// ============================================

/**
 * Convert ETH to wei (18 decimals)
 * Example: 0.001 ETH -> "1000000000000000"
 */
export const toWei = (eth: number): string => {
  return Math.floor(eth * 1e18).toString();
};

/**
 * Convert wei to ETH
 * Example: "1000000000000000" -> 0.001 ETH
 */
export const fromWei = (wei: string | number): number => {
  const value = typeof wei === 'string' ? parseInt(wei) : wei;
  return value / 1e18;
};
