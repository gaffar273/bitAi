import { Wallet, Copy, Check, RefreshCw, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import type { WalletState } from '../hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface Props {
    wallet: WalletState;
    connectWallet: () => void;
    disconnectWallet: () => void;
    refreshBalance: () => void;
}

export function WalletConnect({ wallet, connectWallet, disconnectWallet, refreshBalance }: Props) {
    const [copied, setCopied] = useState(false);
    const isMetaMaskInstalled = typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask);

    const copyAddress = () => {
        if (wallet.address) {
            navigator.clipboard.writeText(wallet.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (address: string | null) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Not connected state
    if (!wallet.address) {
        return (
            <div className="space-y-6 py-4">
                <Card className="border-0 shadow-none bg-transparent">
                    <CardHeader className="text-center px-0">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                            <Wallet className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle>
                            {!isMetaMaskInstalled ? 'MetaMask Not Detected' : 'Connect Wallet'}
                        </CardTitle>
                        <CardDescription>
                            {!isMetaMaskInstalled
                                ? 'Please install MetaMask to continue'
                                : 'Connect to Base Sepolia testnet'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-0">
                        {wallet.error && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{wallet.error}</span>
                            </div>
                        )}

                        {!isMetaMaskInstalled ? (
                            <Button
                                className="w-full"
                                size="lg"
                                asChild
                            >
                                <a
                                    href="https://metamask.io/download/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Install MetaMask
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                </a>
                            </Button>
                        ) : (
                            <>
                                <div className="text-xs text-center text-gray-500">
                                    Network will be added automatically if not configured
                                </div>
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={connectWallet}
                                    disabled={wallet.isConnecting}
                                >
                                    {wallet.isConnecting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Wallet className="w-4 h-4 mr-2" />
                                            Connect Wallet
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Connected state
    return (
        <div className="space-y-6 py-4">
            {/* Wallet Info Card */}
            <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base">Connected Wallet</CardTitle>
                                    {wallet.network && (
                                        <Badge variant="secondary" className="text-xs">
                                            {wallet.network}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="text-sm font-mono text-gray-400">
                                        {formatAddress(wallet.address)}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyAddress}
                                        className="h-6 w-6 p-0"
                                    >
                                        {copied ? (
                                            <Check className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={disconnectWallet}
                        >
                            Disconnect
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 px-0">
                    {/* Balance */}
                    <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">ETH Balance (Base Sepolia)</div>
                        <div className="text-2xl font-bold text-blue-400">
                            {parseFloat(wallet.ethBalance).toFixed(4)} ETH
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={refreshBalance}
                        disabled={wallet.isRefreshing}
                    >
                        {wallet.isRefreshing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh Balance
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Channels Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Yellow Network Channels</CardTitle>
                    <CardDescription>
                        Active payment channels on the Yellow Network
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {wallet.channels.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <p>No active channels</p>
                            <p className="text-sm mt-2">Open a channel to start trading</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {wallet.channels.map((channel, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
                                >
                                    <div>
                                        <div className="font-medium">Channel #{channel.channelId}</div>
                                        <div className="text-sm text-gray-400 mt-1">
                                            Counterparty: {formatAddress(channel.partnerAddress)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-blue-400 font-semibold">
                                            {(channel.balance / 1e18).toFixed(4)} ETH
                                        </div>
                                        <Badge
                                            variant={channel.status === 'open' ? 'default' : 'secondary'}
                                            className="text-xs mt-1"
                                        >
                                            {channel.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Button className="w-full mt-4" variant="outline">
                        Open New Channel
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
