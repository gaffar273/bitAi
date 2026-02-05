/**
 * AgentSwarm API Usage Examples
 * 
 * This file demonstrates how to use all the integrated APIs
 * from the backend in your React components.
 */

import { api, toWei, fromWei } from '../services/api';
import type {
    RegisterAgentRequest,
    ExecuteWorkflowRequest,
    OpenChannelRequest,
    ServiceType
} from '../types';

// ============================================
// 1. HEALTH CHECK
// ============================================

export const checkHealth = async () => {
    try {
        const response = await api.health();
        console.log('Server status:', response.data.status);
        console.log('Timestamp:', response.data.timestamp);
    } catch (error) {
        console.error('Health check failed:', error);
    }
};

// ============================================
// 2. AGENT REGISTRATION
// ============================================

export const registerTranslationAgent = async () => {
    try {
        const agentData: RegisterAgentRequest = {
            services: [
                {
                    type: 'translation',
                    description: 'Translate text between languages',
                    inputSchema: { text: 'string', target_lang: 'string' },
                    outputSchema: { translated: 'string' }
                }
            ],
            pricing: [
                {
                    serviceType: 'translation',
                    priceUsdc: 0.05,
                    unit: 'per 100 words'
                }
            ]
        };

        const response = await api.registerAgent(agentData);
        const agent = response.data.data;

        console.log('Agent registered!');
        console.log('Wallet:', agent.wallet);
        console.log('Private Key:', agent.privateKey); // STORE SECURELY!
        console.log('Reputation:', agent.reputation);

        return agent;
    } catch (error) {
        console.error('Agent registration failed:', error);
    }
};

// ============================================
// 3. GET AGENTS
// ============================================

export const getAllAgents = async () => {
    try {
        const response = await api.getAgents();
        console.log('All agents:', response.data.data);
        return response.data.data;
    } catch (error) {
        console.error('Failed to get agents:', error);
    }
};

export const getTranslationAgents = async () => {
    try {
        const response = await api.getAgents('translation');
        console.log('Translation agents:', response.data.data);
        return response.data.data;
    } catch (error) {
        console.error('Failed to get translation agents:', error);
    }
};

export const getSpecificAgent = async (wallet: string) => {
    try {
        const response = await api.getAgent(wallet);
        console.log('Agent details:', response.data.data);
        return response.data.data;
    } catch (error) {
        console.error('Failed to get agent:', error);
    }
};

// ============================================
// 4. EXECUTE SERVICE (Testing)
// ============================================

export const testTranslationService = async (agentWallet: string) => {
    try {
        const response = await api.executeService(agentWallet, {
            service_type: 'translation',
            input: {
                text: 'Hello world',
                target_lang: 'es'
            }
        });

        const result = response.data.data;
        console.log('Translation result:', result.output);
        console.log('Cost:', result.cost, 'USDC');
        console.log('Duration:', result.duration, 'ms');

        return result;
    } catch (error) {
        console.error('Service execution failed:', error);
    }
};

// ============================================
// 5. WORKFLOW EXECUTION
// ============================================

export const executeNewsTranslationWorkflow = async (orchestratorWallet: string) => {
    try {
        const workflowData: ExecuteWorkflowRequest = {
            orchestratorWallet,
            steps: [
                {
                    serviceType: 'scraper',
                    input: { url: 'https://news.ycombinator.com' }
                },
                {
                    serviceType: 'summarizer'
                    // Input automatically comes from previous step
                },
                {
                    serviceType: 'translation'
                    // Input automatically comes from previous step
                }
            ]
        };

        const response = await api.executeWorkflow(workflowData);
        const workflow = response.data.data;

        console.log('Workflow completed!');
        console.log('Total cost:', workflow.totalCost, 'USDC');
        console.log('Total duration:', workflow.totalDuration, 'ms');
        console.log('Steps executed:', workflow.steps.length);

        workflow.steps.forEach((step, index) => {
            console.log(`Step ${index + 1}:`, step.serviceType);
            console.log('  Agent:', step.agentWallet);
            console.log('  Cost:', step.cost, 'USDC');
            console.log('  Output:', step.output);
        });

        return workflow;
    } catch (error) {
        console.error('Workflow execution failed:', error);
    }
};

// ============================================
// 6. PRICING COMPARISON
// ============================================

export const comparePricing = async (serviceType: ServiceType) => {
    try {
        const response = await api.getPricing(serviceType);
        const pricing = response.data.data;

        console.log(`Pricing for ${serviceType}:`);
        pricing.forEach((agent, index) => {
            console.log(`${index + 1}. ${agent.wallet}`);
            console.log('   Price:', agent.price, 'USDC');
            console.log('   Reputation:', agent.reputation);
        });

        return pricing;
    } catch (error) {
        console.error('Failed to get pricing:', error);
    }
};

// ============================================
// 7. PAYMENT CHANNELS
// ============================================

export const openPaymentChannel = async (
    agentA: string,
    agentB: string,
    balanceEthA: number = 0.001, // 0.001 ETH
    balanceEthB: number = 0.001  // 0.001 ETH
) => {
    try {
        const channelData: OpenChannelRequest = {
            agent_a: agentA,
            agent_b: agentB,
            balance_a: toWei(balanceEthA),
            balance_b: toWei(balanceEthB)
        };

        const response = await api.openChannel(channelData);
        const channel = response.data.data;

        console.log('Channel opened!');
        console.log('Channel ID:', channel.channel_id);
        console.log('Session ID:', channel.session_id);

        return channel;
    } catch (error) {
        console.error('Failed to open channel:', error);
    }
};

export const getChannelState = async (channelId: string) => {
    try {
        const response = await api.getChannel(channelId);
        const channel = response.data.data;

        console.log('Channel state:');
        console.log('Status:', channel.status);
        console.log('Agent A balance:', fromWei(channel.balanceA), 'ETH');
        console.log('Agent B balance:', fromWei(channel.balanceB), 'ETH');
        console.log('Nonce:', channel.nonce);

        return channel;
    } catch (error) {
        console.error('Failed to get channel:', error);
    }
};

export const sendPayment = async (
    channelId: string,
    from: string,
    to: string,
    amountEth: number
) => {
    try {
        const response = await api.transfer({
            channel_id: channelId,
            from,
            to,
            amount: toWei(amountEth)
        });

        const result = response.data.data;
        console.log('Payment sent!');
        console.log('Transaction ID:', result.transaction.id);
        console.log('Gas cost:', result.gas_cost, '(should be 0)');
        console.log('New balances:', result.new_state.balances);

        return result;
    } catch (error) {
        console.error('Payment failed:', error);
    }
};

export const settleChannel = async (channelId: string) => {
    try {
        const response = await api.settleChannel({ channel_id: channelId });
        const result = response.data.data;

        console.log('Channel settled!');
        console.log('Transaction hash:', result.tx_hash);
        console.log('Final balances:', result.final_state.balances);

        return result;
    } catch (error) {
        console.error('Settlement failed:', error);
    }
};

// ============================================
// 8. ANALYTICS
// ============================================

export const getGasSavings = async () => {
    try {
        const response = await api.getSavings();
        const savings = response.data.data;

        console.log('Gas Savings Report:');
        console.log('Total transactions:', savings.totalTransactions);
        console.log('On-chain cost:', savings.onChainCostUsd, 'USD');
        console.log('Yellow cost:', savings.yellowCostUsd, 'USD');
        console.log('Savings:', savings.savingsUsd, 'USD');
        console.log('Savings percent:', savings.savingsPercent, '%');

        return savings;
    } catch (error) {
        console.error('Failed to get savings:', error);
    }
};

export const getRecentTransactions = async (limit: number = 10) => {
    try {
        const response = await api.getTransactions(limit, 0);
        const transactions = response.data.data;

        console.log(`Recent ${limit} transactions:`);
        transactions.forEach((tx, index) => {
            console.log(`${index + 1}. ${tx.id}`);
            console.log('   From:', tx.fromWallet);
            console.log('   To:', tx.toWallet);
            console.log('   Amount:', tx.amount, 'USDC');
            console.log('   Service:', tx.serviceType);
            console.log('   Status:', tx.status);
        });

        return transactions;
    } catch (error) {
        console.error('Failed to get transactions:', error);
    }
};

// ============================================
// 9. COMPLETE WORKFLOW EXAMPLE
// ============================================

export const completeExample = async () => {
    console.log('=== AgentSwarm Complete Example ===\n');

    // 1. Check server health
    console.log('1. Checking server health...');
    await checkHealth();

    // 2. Register agents
    console.log('\n2. Registering agents...');
    const scraper = await registerTranslationAgent();
    const summarizer = await registerTranslationAgent();
    const translator = await registerTranslationAgent();
    const orchestrator = await registerTranslationAgent();

    if (!scraper || !summarizer || !translator || !orchestrator) {
        console.error('Failed to register agents');
        return;
    }

    // 3. Open payment channel
    console.log('\n3. Opening payment channel...');
    const channel = await openPaymentChannel(
        orchestrator.wallet,
        scraper.wallet,
        0.01, // 0.01 ETH
        0.01  // 0.01 ETH
    );

    if (!channel) {
        console.error('Failed to open channel');
        return;
    }

    // 4. Execute workflow
    console.log('\n4. Executing workflow...');
    await executeNewsTranslationWorkflow(orchestrator.wallet);

    // 5. Check savings
    console.log('\n5. Checking gas savings...');
    await getGasSavings();

    // 6. Get recent transactions
    console.log('\n6. Getting recent transactions...');
    await getRecentTransactions(5);

    console.log('\n=== Example Complete! ===');
};

// ============================================
// 10. REACT COMPONENT EXAMPLE
// ============================================

/**
 * Example React component using the API
 */
/*
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Agent } from '../types';

export const AgentDashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await api.getAgents();
        setAgents(response.data.data);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Registered Agents</h1>
      {agents.map(agent => (
        <div key={agent.wallet}>
          <h3>{agent.wallet}</h3>
          <p>Reputation: {agent.reputation}</p>
          <p>Services: {agent.services.map(s => s.type).join(', ')}</p>
        </div>
      ))}
    </div>
  );
};
*/
