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