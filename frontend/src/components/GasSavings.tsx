import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame, Timer, TrendingUp, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '@/components/ui/badge';

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
    const interval = setInterval(loadSavings, 3000);
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
      <div className="flex flex-col items-center justify-center p-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
        </div>
        <p className="text-gray-400">Loading savings data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-4xl font-bold">
            <span className="text-white">Gas Savings</span>
            <span className="text-yellow-400 ml-2">Analysis</span>
          </h1>
        </div>
        <p className="text-gray-400 text-lg">
          Real-time comparison: Yellow Network vs Traditional L1 Blockchain
        </p>
      </motion.div>

      {/* Main Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Without Yellow */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8 border-2 border-red-500/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-red-400">Standard L1 Transaction</h3>
                <p className="text-sm text-gray-500">Traditional On-Chain Gas Fees</p>
              </div>
            </div>
            <div className="text-6xl font-bold text-red-400 mb-3">
              ${savings.onChainCostUsd.toFixed(2)}
            </div>
            <div className="text-gray-500">
              {savings.totalTransactions} transactions × ~$5.00 avg gas
            </div>
          </div>
        </motion.div>

        {/* With Yellow */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-8 border-2 border-emerald-500/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-emerald-400">Yellow State Channels</h3>
                <p className="text-sm text-gray-500">Off-chain High Frequency Trading</p>
              </div>
            </div>
            <div className="text-6xl font-bold text-emerald-400 mb-3">
              ${savings.yellowCostUsd.toFixed(2)}
            </div>
            <div className="text-gray-500">
              Open Channel + {savings.totalTransactions} txs + Settlement
            </div>
          </div>
        </motion.div>
      </div>

      {/* Savings Highlight */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 rounded-3xl blur-xl" />
        <div className="glass rounded-3xl p-12 text-center relative overflow-hidden border border-yellow-500/20">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-semibold">Total Capital Preserved</h2>
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>

            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}
              className="text-8xl font-black bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent mb-6 font-mono"
            >
              ${savings.savingsUsd.toFixed(2)}
            </motion.div>

            <Badge
              className="text-lg py-2 px-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400"
            >
              {savings.savingsPercent.toFixed(2)}% Efficiency Gain
            </Badge>

            <p className="text-gray-400 max-w-xl mx-auto mt-6 leading-relaxed">
              By utilizing state channels, we eliminate gas costs for intermediate transactions, making high-frequency agent interactions economically viable.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {[
          { icon: Zap, label: 'Total Txs', value: savings.totalTransactions, color: 'from-yellow-500 to-amber-500' },
          { icon: Flame, label: 'Saved / Tx', value: `$${(savings.savingsUsd / (savings.totalTransactions || 1)).toFixed(2)}`, color: 'from-orange-500 to-red-500' },
          { icon: Timer, label: 'Latency', value: '<1s', color: 'from-emerald-500 to-teal-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="glass rounded-2xl p-8 text-center hover-glow"
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4`}>
              <stat.icon className="w-7 h-7 text-black" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">
              {stat.value}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}