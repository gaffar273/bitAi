import type { Transaction } from '../types';
import { motion } from 'framer-motion';

interface Props {
  tx: Transaction;
}

export function TransactionItem({ tx }: Props) {
  const serviceEmoji = {
    'translation': '🌍',
    'image_gen': '🎨',
    'scraper': '🔍',
    'summarizer': '📝',
  }[tx.service_type] || '💸';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700"
    >
      <span className="text-2xl">{serviceEmoji}</span>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {tx.from.slice(0, 6)}...
          </span>
          <span className="text-green-400">→</span>
          <span className="text-sm text-gray-400">
            {tx.to.slice(0, 6)}...
          </span>
        </div>
        <p className="text-xs text-gray-500 capitalize">
          {tx.service_type.replace('_', ' ')}
        </p>
      </div>
      
      <div className="text-right">
        <p className="text-lg font-bold text-green-400">
          ${(tx.amount / 1000000).toFixed(2)}
        </p>
        <p className="text-xs text-gray-500">
          Gas: ${tx.gas_cost.toFixed(4)}
        </p>
      </div>
    </motion.div>
  );
}