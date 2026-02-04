export interface Agent {
  wallet: string;
  services: string[];
  pricing: number[];
  reputation: number;
  active: boolean;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  service_type: string;
  timestamp: number;
  gas_cost: number;
}
export interface WorkflowStep {
  serviceType: 'translation' | 'summarizer' | 'scraper' | 'image_gen';
  input?: any;
  agentWallet?: string;
}

export interface WorkflowResult {
  success: boolean;
  steps: {
    step: number;
    serviceType: string;
    agentWallet: string;
    input: any;
    output: any;
    cost: number;
    duration: number;
    paymentTxId: string;
  }[];
  totalCost: number;
  totalDuration: number;
}