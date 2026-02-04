import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

interface SavingsData {
  totalTransactions: number;
  onChainCostUsd: number;
  yellowCostUsd: number;
  savingsUsd: number;
  savingsPercent: number;
}

export function GasSavings() {
  const [savings, setSavings] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavings();
    const interval = setInterval(loadSavings, 3000); // Update every 3s
    return () => clearInterval(interval);
  }, []);

  const loadSavings = async () => {
    try {
      const response = await api.getSavings();
      setSavings(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load savings:', error);
    }
  };

  if (loading || !savings) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading savings data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">💰 Gas Savings</h1>
        <p className="text-xl text-gray-400">
          Real-time comparison: Yellow vs Traditional Blockchain
        </p>
      </div>

      {/* Main Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Without Yellow */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-red-900/20 border-2 border-red-500 rounded-xl p-8"
        >
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-2 text-red-400">
              ❌ Without Yellow
            </h3>
            <p className="text-sm text-gray-400 mb-6">Traditional On-Chain</p>
            
            <div className="text-6xl font-bold text-red-500 mb-4">
              ${savings.onChainCostUsd.toFixed(2)}
            </div>
            
            <div className="text-sm text-gray-400">
              {savings.totalTransactions} transactions × $5 gas
            </div>
          </div>
        </motion.div>

        {/* With Yellow */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-green-900/20 border-2 border-green-500 rounded-xl p-8"
        >
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-2 text-green-400">
              ✅ With Yellow
            </h3>
            <p className="text-sm text-gray-400 mb-6">State Channels</p>
            
            <div className="text-6xl font-bold text-green-500 mb-4">
              ${savings.yellowCostUsd.toFixed(2)}
            </div>
            
            <div className="text-sm text-gray-400">
              Open + {savings.totalTransactions} txs + Settle
            </div>
          </div>
        </motion.div>
      </div>

      {/* Savings Highlight */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-2 border-purple-500 rounded-2xl p-12 text-center mb-12"
      >
        <div className="mb-4">
          <span className="text-7xl">🎉</span>
        </div>
        <h2 className="text-3xl font-bold mb-4">Total Savings</h2>
        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-4">
          ${savings.savingsUsd.toFixed(2)}
        </div>
        <div className="text-4xl font-bold text-yellow-400 mb-2">
          {savings.savingsPercent.toFixed(2)}% Saved
        </div>
        <p className="text-gray-300 text-lg">
          Yellow makes micropayments economically viable
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">⚡</div>
          <div className="text-3xl font-bold text-blue-400">
            {savings.totalTransactions}
          </div>
          <div className="text-sm text-gray-400">Total Transactions</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">🔥</div>
          <div className="text-3xl font-bold text-orange-400">
            ${(savings.savingsUsd / savings.totalTransactions).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Saved per Transaction</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">⏱️</div>
          <div className="text-3xl font-bold text-green-400">
            &lt;1s
          </div>
          <div className="text-sm text-gray-400">Transaction Speed</div>
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-12 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">🤔 How Does This Work?</h3>
        <div className="space-y-3 text-gray-300">
          <p>
            <strong className="text-blue-400">Traditional Blockchain:</strong> Every payment = 1 transaction = ~$5 gas fee
          </p>
          <p>
            <strong className="text-green-400">Yellow State Channels:</strong> Open channel once → unlimited off-chain payments ($0 gas) → settle once
          </p>
          <p>
            <strong className="text-yellow-400">The Math:</strong> {savings.totalTransactions} txs would cost ${savings.onChainCostUsd.toFixed(2)} on-chain. With Yellow: only ${savings.yellowCostUsd.toFixed(2)}!
          </p>
        </div>
      </div>
    </div>
  );
}