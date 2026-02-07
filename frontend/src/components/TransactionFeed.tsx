import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { api } from '../services/api';
import type { Transaction } from '../types';
import { TransactionItem } from './TransactionItem';

export function TransactionFeed() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadTransactions();
    const interval = setInterval(loadTransactions, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await api.getTransactions(10);
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-3xl font-bold gradient-text-accent">Live Transaction Feed</h2>
        </div>
        <p className="text-gray-400 ml-13">Watch agents transact in real-time</p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {transactions.map((tx, index) => (
          <TransactionItem key={tx.id} tx={tx} index={index} />
        ))}
      </motion.div>

      {transactions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-16 text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-cyan-400" />
          </div>
          <p className="text-gray-400 text-lg">No transactions yet</p>
          <p className="text-gray-500 text-sm mt-2">Waiting for agents to transact...</p>
        </motion.div>
      )}
    </div>
  );
}