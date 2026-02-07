import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUpRight, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api, fromWei } from '../services/api';
import type { PaymentChannel, Transaction } from '../types';

interface Props {
    channelId: string;
    onSettle?: () => void;
    onSettleOnChain?: () => void;
    showTransactions?: boolean;
}

interface ChannelState {
    channel: PaymentChannel | null;
    transactions: Transaction[];
    loading: boolean;
    error: string | null;
}

export function PaymentChannelCard({
    channelId,
    onSettle,
    onSettleOnChain,
    showTransactions = true
}: Props) {
    const [state, setState] = useState<ChannelState>({
        channel: null,
        transactions: [],
        loading: true,
        error: null,
    });
    const [settling, setSettling] = useState(false);

    const fetchChannel = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const [channelRes, txRes] = await Promise.all([
                api.getChannel(channelId),
                showTransactions ? api.getChannelTransactions(channelId) : Promise.resolve({ data: { data: { transactions: [] } } }),
            ]);

            setState({
                channel: channelRes.data.data,
                transactions: txRes.data?.data?.transactions || [],
                loading: false,
                error: null,
            });
        } catch (error: unknown) {
            let errorMessage = 'Failed to load channel';

            // Check if it's a 404 - channel doesn't exist (possibly server restarted)
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number } };
                if (axiosError.response?.status === 404) {
                    errorMessage = 'Channel not found - it may have expired or the server was restarted';
                }
            }

            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
            }));
        }
    }, [channelId, showTransactions]);

    useEffect(() => {
        fetchChannel();
        // Poll for updates every 5 seconds
        const interval = setInterval(fetchChannel, 5000);
        return () => clearInterval(interval);
    }, [fetchChannel]);


    const handleSettle = async () => {
        if (!onSettle) return;
        setSettling(true);
        try {
            await onSettle();
            await fetchChannel();
        } finally {
            setSettling(false);
        }
    };

    const handleSettleOnChain = async () => {
        if (!onSettleOnChain) return;
        setSettling(true);
        try {
            await onSettleOnChain();
            await fetchChannel();
        } finally {
            setSettling(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Open</Badge>;
            case 'settled':
                return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Settled</Badge>;
            case 'settling':
                return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Settling...</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (state.loading && !state.channel) {
        return (
            <Card className="bg-gray-900/50 border-gray-700">
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                    <span className="ml-2 text-gray-400">Loading channel...</span>
                </CardContent>
            </Card>
        );
    }

    if (state.error) {
        return (
            <Card className="bg-gray-900/50 border-red-500/30">
                <CardContent className="flex items-center justify-center py-8">
                    <XCircle className="w-6 h-6 text-red-400" />
                    <span className="ml-2 text-red-400">{state.error}</span>
                </CardContent>
            </Card>
        );
    }

    const { channel, transactions } = state;

    return (
        <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            Payment Channel
                            {getStatusBadge(channel?.status || 'unknown')}
                        </CardTitle>
                        <CardDescription className="text-gray-400 text-sm font-mono mt-1">
                            {channelId.slice(0, 20)}...
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchChannel}
                        disabled={state.loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Balances */}
                {channel && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">Your Balance</div>
                            <div className="text-lg font-semibold text-white">
                                {fromWei(channel.balanceA).toFixed(6)} ETH
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                                {channel.agentA.slice(0, 10)}...
                            </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">Agent Pool</div>
                            <div className="text-lg font-semibold text-white">
                                {fromWei(channel.balanceB).toFixed(6)} ETH
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                                {channel.agentB.slice(0, 10)}...
                            </div>
                        </div>
                    </div>
                )}

                {/* Transaction Count */}
                {channel && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Transactions</span>
                        <span className="text-white font-medium">{channel.nonce}</span>
                    </div>
                )}

                {/* Recent Transactions */}
                {showTransactions && transactions.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-sm text-gray-400">Recent Payments</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {transactions.slice(0, 5).map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between text-xs bg-gray-800/30 rounded px-2 py-1.5"
                                >
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                        <span className="text-gray-300 font-mono">
                                            {tx.fromWallet?.slice(0, 6)}...
                                            <ArrowUpRight className="w-3 h-3 inline mx-1" />
                                            {tx.toWallet?.slice(0, 6)}...
                                        </span>
                                    </div>
                                    <span className="text-amber-400 font-medium">
                                        {fromWei(tx.amount).toFixed(6)} ETH
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gas Savings */}
                {channel && channel.nonce > 0 && (
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-green-400 mb-1">Gas Saved</div>
                                <div className="text-lg font-bold text-green-400">
                                    ${(channel.nonce * 5).toFixed(2)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-400 mb-1">vs On-Chain</div>
                                <div className="text-sm text-gray-300">
                                    {channel.nonce} txs x $5/tx
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                {channel?.status === 'open' && (
                    <div className="flex gap-2">
                        {onSettle && (
                            <Button
                                variant="outline"
                                className="flex-1 border-amber-500/30 hover:bg-amber-500/10"
                                onClick={handleSettle}
                                disabled={settling}
                            >
                                {settling ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Clock className="w-4 h-4 mr-2" />
                                )}
                                Settle Channel
                            </Button>
                        )}
                        {onSettleOnChain && (
                            <Button
                                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold"
                                onClick={handleSettleOnChain}
                                disabled={settling}
                            >
                                {settling ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <ArrowUpRight className="w-4 h-4 mr-2" />
                                )}
                                Settle On-Chain
                            </Button>
                        )}
                    </div>
                )}

                {/* Settled State */}
                {channel?.status === 'settled' && channel.settleTxHash && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-blue-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Channel Settled</span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-1">
                            TX: {channel.settleTxHash.slice(0, 20)}...
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
