import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame, Timer, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400">Loading savings data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-3">
          <TrendingUp className="w-10 h-10 text-green-500" />
          Gas Savings Analysis
        </h1>
        <p className="text-gray-400 text-lg">
          Real-time comparison: Yellow Network vs Traditional L1 Blockchain
        </p>
      </div>

      {/* Main Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Without Yellow */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="border-red-500/30 bg-red-950/10">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <CardTitle className="text-red-400">Standard L1 Transaction</CardTitle>
              </div>
              <CardDescription>Traditional On-Chain Gas Fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-red-500 mb-4">
                ${savings.onChainCostUsd.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">
                {savings.totalTransactions} transactions × ~$5.00 avg gas
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* With Yellow */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="border-green-500/30 bg-green-950/10 h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <CardTitle className="text-green-400">Yellow State Channels</CardTitle>
              </div>
              <CardDescription>Off-chain High Frequency Trading</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold text-green-500 mb-4">
                ${savings.yellowCostUsd.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">
                Open Channel + {savings.totalTransactions} txs + Settlement
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Savings Highlight */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-blue-950/50 to-purple-950/50 border-blue-500/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />

          <CardContent className="p-12 text-center relative z-10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center justify-center gap-2">
              Total Capital Preserved
            </h2>
            <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 mb-6 font-mono">
              ${savings.savingsUsd.toFixed(2)}
            </div>
            <Badge variant="outline" className="text-xl py-1 px-4 border-yellow-500/50 text-yellow-400 bg-yellow-500/10 mb-4">
              {savings.savingsPercent.toFixed(2)}% Efficiency Gain
            </Badge>
            <p className="text-gray-400 max-w-lg mx-auto mt-4">
              By utilizing state channels, we eliminate gas costs for intermediate transactions, making high-frequency agent interactions economically viable.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex flex-col items-center">
            <Zap className="w-8 h-8 text-blue-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {savings.totalTransactions}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Total Txs</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center">
            <Flame className="w-8 h-8 text-orange-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              ${(savings.savingsUsd / (savings.totalTransactions || 1)).toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Saved / Tx</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center">
            <Timer className="w-8 h-8 text-green-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              &lt;1s
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Latency</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}