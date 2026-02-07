import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, FileText, Globe, Search, Palette, Bot, Trash2, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, fromWei } from '../services/api';
import type { Transaction } from '../types';
import type { WalletState } from '../hooks/use-wallet';

interface Props {
  wallet: WalletState;
}

interface ExecutionEntry {
  id: string;
  agentWallet: string;
  serviceType: string;
  input: Record<string, string>;
  output: unknown;
  cost: number;
  duration: number;
  timestamp: string;
  success: boolean;
}

const HISTORY_KEY = 'agent_execution_history';

const serviceIcons: Record<string, typeof Globe> = {
  translation: Globe,
  scraper: Search,
  summarizer: FileText,
  pdf_loader: FileText,
  image_gen: Palette,
};

const serviceGradients: Record<string, string> = {
  translation: 'from-emerald-500 to-teal-500',
  scraper: 'from-blue-500 to-cyan-500',
  summarizer: 'from-yellow-500 to-amber-500',
  pdf_loader: 'from-amber-500 to-orange-500',
  image_gen: 'from-pink-500 to-rose-500',
};

function formatOutput(output: unknown): string {
  if (!output) return 'No output';
  if (typeof output === 'string') return output;
  if (typeof output === 'object' && output !== null) {
    if ('output' in output) return String((output as { output: unknown }).output);
    if ('translated' in output) return String((output as { translated: unknown }).translated);
    if ('summary' in output) return String((output as { summary: unknown }).summary);
    if ('data' in output) return JSON.stringify((output as { data: unknown }).data, null, 2);
    return JSON.stringify(output, null, 2);
  }
  return String(output);
}

export function PaymentDashboard({ wallet }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<ExecutionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'history' | 'transactions' | 'channels'>('history');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!wallet.address) return;

    const loadTransactions = async () => {
      setLoading(true);
      try {
        const res = await api.getTransactions(50);
        setTransactions(res.data.data || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, [wallet.address]);

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const totalSpent = history.reduce((sum, h) => sum + (h.success ? h.cost : 0), 0);
  const successCount = history.filter(h => h.success).length;

  if (!wallet.address) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-16 text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
          <p className="text-gray-400">Connect your wallet to view payment history and spending</p>
        </motion.div>
      </div>
    );
  }

  const viewTabs = [
    { id: 'history' as const, label: 'Execution History' },
    { id: 'transactions' as const, label: 'Transactions' },
    { id: 'channels' as const, label: 'Channels' },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">Payments &</span>
            <span className="text-yellow-400 ml-2">History</span>
          </h1>
        </div>
        <p className="text-gray-400 ml-13">Track your spending, execution history, and payment channels</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'ETH Balance', value: parseFloat(wallet.ethBalance).toFixed(4), color: 'from-blue-500 to-cyan-500' },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(4)}`, color: 'from-yellow-500 to-amber-500' },
          { label: 'Successful Runs', value: successCount, color: 'from-emerald-500 to-teal-500' },
          { label: 'Active Channels', value: wallet.channels.length, color: 'from-orange-500 to-red-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="glass rounded-2xl p-5 text-center hover-glow"
          >
            <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-400 mt-1 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* View Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2"
      >
        {viewTabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`
              relative px-5 py-2.5 rounded-xl transition-all duration-300
              ${activeView === tab.id
                ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black font-semibold'
                : 'glass text-gray-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            {tab.label}
          </Button>
        ))}
      </motion.div>

      {/* Execution History View */}
      {activeView === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Execution History</h3>
              <p className="text-sm text-gray-400">Your agent execution runs (persisted locally)</p>
            </div>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="glass border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
          <div className="p-6">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="font-medium text-gray-400">No execution history yet</p>
                <p className="text-sm text-gray-500 mt-1">Try running an agent from the Agents tab</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry, index) => {
                  const Icon = serviceIcons[entry.serviceType] || Bot;
                  const gradient = serviceGradients[entry.serviceType] || 'from-yellow-500 to-amber-500';
                  const isExpanded = expandedEntry === entry.id;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="glass rounded-xl overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium capitalize flex items-center gap-2">
                              {entry.serviceType.replace('_', ' ')}
                              {entry.success ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {entry.agentWallet.slice(0, 8)}... | {new Date(entry.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${entry.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {entry.success ? `$${entry.cost.toFixed(4)}` : 'Failed'}
                          </div>
                          {entry.success && (
                            <div className="text-xs text-gray-500">{(entry.duration / 1000).toFixed(2)}s</div>
                          )}
                        </div>
                      </div>

                      {isExpanded && entry.success && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="border-t border-white/5 p-4 bg-black/20"
                        >
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Input</div>
                          <div className="glass rounded-lg p-3 mb-3 max-h-24 overflow-y-auto">
                            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                              {JSON.stringify(entry.input, null, 2)}
                            </pre>
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Output</div>
                          <div className="glass rounded-lg p-3 max-h-48 overflow-y-auto">
                            <pre className="text-xs text-gray-200 whitespace-pre-wrap font-mono">
                              {formatOutput(entry.output)}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Transactions View */}
      {activeView === 'transactions' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-semibold">Payment Transactions</h3>
            <p className="text-sm text-gray-400">On-chain and off-chain payment records</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass rounded-xl p-4 animate-pulse flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-white/10 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <ArrowUpRight className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="font-medium text-gray-400">No transactions yet</p>
                <p className="text-sm text-gray-500 mt-1">Transactions will appear after workflow executions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => {
                  const Icon = serviceIcons[tx.serviceType || ''] || Bot;
                  const gradient = serviceGradients[tx.serviceType || ''] || 'from-yellow-500 to-amber-500';

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="glass rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {tx.serviceType?.replace('_', ' ') || 'Payment'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono flex items-center gap-1">
                            {tx.fromWallet?.slice(0, 6)}...
                            <ArrowUpRight className="w-3 h-3" />
                            {tx.toWallet?.slice(0, 6)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-yellow-400">
                          {fromWei(tx.amount).toFixed(6)} ETH
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Channels View */}
      {activeView === 'channels' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-semibold">Payment Channels</h3>
            <p className="text-sm text-gray-400">Your Yellow Network state channels</p>
          </div>
          <div className="p-6">
            {wallet.channels.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="font-medium text-gray-400">No channels open</p>
                <p className="text-sm text-gray-500 mt-1">Open a payment channel from the wallet dialog</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wallet.channels.map((channel, index) => (
                  <motion.div
                    key={channel.channelId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl p-5 hover-glow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-medium">Channel</div>
                        <div className="text-xs text-gray-500 font-mono">{channel.channelId.slice(0, 20)}...</div>
                      </div>
                      <Badge
                        className={
                          channel.status === 'open'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                        }
                      >
                        {channel.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass rounded-lg p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Your Balance</div>
                        <div className="text-xl font-bold text-yellow-400 mt-1">
                          {(channel.balance / 1e18).toFixed(4)} ETH
                        </div>
                      </div>
                      <div className="glass rounded-lg p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Partner</div>
                        <div className="text-sm font-mono text-gray-300 mt-2">
                          {channel.partnerAddress.slice(0, 10)}...
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
