import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Transaction } from '../types';
import { TransactionItem } from './TransactionItem';

export function TransactionFeed() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadTransactions();
    
    // Poll for new transactions every 2 seconds
    const interval = setInterval(loadTransactions, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await api.getTransactions(10); // Last 10 txs
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Live Transaction Feed</h2>
        <p className="text-gray-400">Watch agents transact in real-time</p>
      </div>

      <div className="space-y-3">
        {transactions.map(tx => (
          <TransactionItem key={tx.id} tx={tx} />
        ))}
      </div>

      {transactions.length === 0 && (
        <p className="text-gray-400 text-center py-12">
          No transactions yet. Waiting for agents to transact...
        </p>
      )}
    </div>
  );
}