import axios from 'axios';
import type { WorkflowStep } from '../types';

const API_BASE = 'http://localhost:5000';

export const api = {
  // Health check
  health: () => axios.get(`${API_BASE}/health`),
  
  // Agents
  getAgents: (serviceType?: string) => 
    axios.get(`${API_BASE}/api/agents`, { 
      params: serviceType ? { service_type: serviceType } : {} 
    }),
  
  getAgent: (wallet: string) => 
    axios.get(`${API_BASE}/api/agents/${wallet}`),
  
  // Analytics
  getSavings: () => 
    axios.get(`${API_BASE}/api/analytics/savings`),
  
  getTransactions: (limit = 50) => 
    axios.get(`${API_BASE}/api/analytics/transactions`, { 
      params: { limit } 
    }),

  // Workflow (ADD THIS)
  executeWorkflow: (orchestratorWallet: string, steps: WorkflowStep[]) =>
    axios.post(`${API_BASE}/api/orchestrator/workflow`, {
      orchestratorWallet,
      steps
    }),
};