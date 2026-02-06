import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, FileText, Globe, Search, Palette, Bot, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

const serviceColors: Record<string, string> = {
  translation: 'text-green-400',
  scraper: 'text-blue-400',
  summarizer: 'text-purple-400',
  pdf_loader: 'text-amber-400',
  image_gen: 'text-pink-400',
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

  // Load execution history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Load transactions from API
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

  // Calculate totals
  const totalSpent = history.reduce((sum, h) => sum + (h.success ? h.cost : 0), 0);
  const successCount = history.filter(h => h.success).length;
  const failCount = history.filter(h => !h.success).length;

  if (!wallet.address) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
          <p className="text-gray-400">Connect your wallet to view payment history and spending</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Payments & History</h1>
        <p className="text-gray-400">Track your spending, execution history, and payment channels</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <div className="text-3xl font-bold text-blue-400">
              {parseFloat(wallet.ethBalance).toFixed(4)}
            </div>
            <div className="text-sm text-gray-400 mt-1">ETH Balance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <div className="text-3xl font-bold text-green-400">${totalSpent.toFixed(4)}</div>
            <div className="text-sm text-gray-400 mt-1">Total Spent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <div className="text-3xl font-bold text-purple-400">{successCount}</div>
            <div className="text-sm text-gray-400 mt-1">Successful Runs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <div className="text-3xl font-bold text-orange-400">{wallet.channels.length}</div>
            <div className="text-sm text-gray-400 mt-1">Active Channels</div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'history' as const, label: 'Execution History' },
          { id: 'transactions' as const, label: 'Transactions' },
          { id: 'channels' as const, label: 'Channels' },
        ]).map(tab => (
          <Button
            key={tab.id}
            variant={activeView === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveView(tab.id)}
            size="sm"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Execution History View */}
      {activeView === 'history' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Execution History</CardTitle>
                <CardDescription>Your agent execution runs (persisted locally)</CardDescription>
              </div>
              {history.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearHistory} className="text-gray-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No execution history yet</p>
                <p className="text-sm mt-1">Try running an agent from the Agents tab</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(entry => {
                  const Icon = serviceIcons[entry.serviceType] || Bot;
                  const color = serviceColors[entry.serviceType] || 'text-gray-400';
                  const isExpanded = expandedEntry === entry.id;

                  return (
                    <div
                      key={entry.id}
                      className="border border-gray-800 rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                        onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md bg-gray-800 ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium capitalize flex items-center gap-2">
                              {entry.serviceType.replace('_', ' ')}
                              {entry.success ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
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
                          <div className={`font-semibold ${entry.success ? 'text-green-400' : 'text-red-400'}`}>
                            {entry.success ? `$${entry.cost.toFixed(4)}` : 'Failed'}
                          </div>
                          {entry.success && (
                            <div className="text-xs text-gray-500">{(entry.duration / 1000).toFixed(2)}s</div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Output */}
                      {isExpanded && entry.success && (
                        <div className="border-t border-gray-800 p-4 bg-gray-950/50">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Input</div>
                          <div className="p-3 bg-gray-900 rounded-lg border border-gray-800 mb-3 max-h-24 overflow-y-auto">
                            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                              {JSON.stringify(entry.input, null, 2)}
                            </pre>
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Output</div>
                          <div className="p-3 bg-gray-900 rounded-lg border border-gray-800 max-h-48 overflow-y-auto">
                            <pre className="text-xs text-gray-200 whitespace-pre-wrap font-mono">
                              {formatOutput(entry.output)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions View */}
      {activeView === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Transactions</CardTitle>
            <CardDescription>On-chain and off-chain payment records</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ArrowUpRight className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm mt-1">Transactions will appear after workflow executions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => {
                  const Icon = serviceIcons[tx.serviceType || ''] || Bot;
                  const color = serviceColors[tx.serviceType || ''] || 'text-gray-400';

                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md bg-gray-800 ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {tx.serviceType?.replace('_', ' ') || 'Payment'}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {tx.fromWallet?.slice(0, 6)}...
                            <ArrowUpRight className="w-3 h-3 inline mx-1" />
                            {tx.toWallet?.slice(0, 6)}...
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-purple-400">
                          {fromWei(tx.amount).toFixed(6)} ETH
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Channels View */}
      {activeView === 'channels' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Channels</CardTitle>
            <CardDescription>Your Yellow Network state channels</CardDescription>
          </CardHeader>
          <CardContent>
            {wallet.channels.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wallet className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No channels open</p>
                <p className="text-sm mt-1">Open a payment channel from the wallet dialog</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wallet.channels.map(channel => (
                  <div key={channel.channelId} className="p-4 bg-gray-800/30 rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">Channel</div>
                        <div className="text-xs text-gray-500 font-mono">{channel.channelId.slice(0, 20)}...</div>
                      </div>
                      <Badge
                        variant={channel.status === 'open' ? 'default' : 'secondary'}
                      >
                        {channel.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-900/50 rounded-lg">
                        <div className="text-xs text-gray-500">Your Balance</div>
                        <div className="text-lg font-bold text-blue-400">
                          {(channel.balance / 1e18).toFixed(4)} ETH
                        </div>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-lg">
                        <div className="text-xs text-gray-500">Partner</div>
                        <div className="text-sm font-mono text-gray-300 mt-1">
                          {channel.partnerAddress.slice(0, 10)}...
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
