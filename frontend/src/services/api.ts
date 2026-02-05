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
};

// ============================================
// Utility Functions
// ============================================

/**
 * Convert USDC to micro-USDC (6 decimals)
 * Example: 1.5 USDC -> "1500000"
 */
export const toMicroUsdc = (usdc: number): string => {
  return Math.floor(usdc * 1_000_000).toString();
};

/**
 * Convert micro-USDC to USDC
 * Example: "1500000" -> 1.5 USDC
 */
export const fromMicroUsdc = (microUsdc: string | number): number => {
  const value = typeof microUsdc === 'string' ? parseInt(microUsdc) : microUsdc;
  return value / 1_000_000;
};
