import type { Transaction } from '../types';
import { motion } from 'framer-motion';
import { Globe, Palette, Search, FileText, Bot, ArrowRight } from 'lucide-react';

interface Props {
  tx: Transaction;
  index?: number;
}

const serviceIcons: Record<string, typeof Globe> = {
  translation: Globe,
  scraper: Search,
  summarizer: FileText,
  image_gen: Palette,
};

const serviceGradients: Record<string, string> = {
  translation: 'from-emerald-500 to-teal-500',
  scraper: 'from-blue-500 to-cyan-500',
  summarizer: 'from-yellow-500 to-amber-500',
  image_gen: 'from-pink-500 to-rose-500',
  orchestrator: 'from-yellow-500 to-orange-500',
};

export function TransactionItem({ tx, index = 0 }: Props) {
  const Icon = serviceIcons[tx.serviceType || ''] || Bot;
  const gradient = serviceGradients[tx.serviceType || ''] || 'from-yellow-500 to-amber-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="glass rounded-xl p-5 flex items-center gap-4 hover-glow"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-300 font-mono">
            {tx.fromWallet?.slice(0, 6) || '???'}...
          </span>
          <ArrowRight className="w-4 h-4 text-emerald-400" />
          <span className="text-gray-300 font-mono">
            {tx.toWallet?.slice(0, 6) || '???'}...
          </span>
        </div>
        <p className="text-xs text-gray-500 capitalize mt-1">
          {(tx.serviceType || 'payment').replace('_', ' ')}
        </p>
      </div>

      <div className="text-right">
        <p className="text-lg font-bold gradient-text-accent">
          {((tx.amount ?? 0) / 1e18).toFixed(4)} ETH
        </p>
        <p className="text-xs text-gray-500">
          Gas: {(tx.gasCost ?? 0).toFixed(4)}
        </p>
      </div>
    </motion.div>
  );
}
