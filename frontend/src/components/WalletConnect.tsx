import { Wallet, Copy, Check, RefreshCw, ExternalLink, AlertCircle, Loader2, Plus, ArrowUpRight } from 'lucide-react';
import type { WalletState } from '../hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { PaymentChannelCard } from './PaymentChannelCard';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

interface Props {
    wallet: WalletState;
    connectWallet: () => void;
    disconnectWallet: () => void;
    refreshBalance: () => void;
}

export function WalletConnect({ wallet, connectWallet, disconnectWallet, refreshBalance }: Props) {
    const [copied, setCopied] = useState(false);
    const [openingChannel, setOpeningChannel] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
    const isMetaMaskInstalled = typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask);

    const copyAddress = () => {
        if (wallet.address) {
            navigator.clipboard.writeText(wallet.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Address copied to clipboard');
        }
    };

    const formatAddress = (address: string | null) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleOpenChannel = async () => {
        if (!wallet.address) return;
        setOpeningChannel(true);
        try {
            const depositAmount = '1000000000000000'; // 0.001 ETH in wei

            // 1. Fetch platform address from backend
            const configResponse = await api.getPlatformConfig();
            const platformAddress = configResponse.data.data.platformWallet;

            if (!platformAddress) {
                toast.error('Could not fetch platform address');
                return;
            }

            // 2. Send real ETH via MetaMask to platform
            if (!window.ethereum) {
                toast.error('MetaMask is required to deposit ETH');
                return;
            }

            // Request user to send ETH to platform
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: wallet.address,
                    to: platformAddress,
                    value: '0x' + BigInt(depositAmount).toString(16), // 0.001 ETH in hex
                }],
            });

            console.log('[WalletConnect] Deposit tx sent:', txHash);
            toast.success('Deposit transaction sent');

            // 3. Create channel after deposit
            await api.fundWalletChannel(wallet.address, {
                amount: depositAmount,
                partnerAddress: platformAddress,
            });

            // 4. Record the deposit
            await api.recordDeposit(wallet.address, {
                amount: parseInt(depositAmount, 10),
                txHash: txHash as string,
                token: 'ETH',
            });

            toast.success('Channel opened successfully');
            refreshBalance();
        } catch (error) {
            console.error('Failed to open channel:', error);
            toast.error('Failed to open channel. Transaction may have been rejected.');
        } finally {
            setOpeningChannel(false);
        }
    };

    const handleSettleChannel = async (channelId: string) => {
        try {
            const response = await api.settleChannel({ channel_id: channelId });
            const data = response.data;

            // Check if we need to sign (new flow)
            // The response could be either a settled response or a signing-required response
            const responseData = data as unknown as { success: boolean; data: Record<string, unknown> };
            if (responseData.success && responseData.data && 'requires_signing' in responseData.data && responseData.data.requires_signing === true) {
                const txData = responseData.data.tx_data as { to: string; value: string; data: string; chainId: number };

                if (!window.ethereum) {
                    toast.error('MetaMask is required to sign the settlement.');
                    return;
                }

                toast('Please sign the settlement transaction in MetaMask.', { icon: '✍️' });

                // Request signature/send transaction via MetaMask
                // For settlement, we are sending a transaction
                const params = [
                    {
                        from: wallet.address,
                        to: txData.to,
                        value: '0x0', // 0 value for now, or txData.value (hex)
                        data: txData.data,
                        chainId: '0x' + txData.chainId.toString(16),
                    },
                ];

                const txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params,
                });

                console.log('Client-side settlement tx sent:', txHash);

                // Notify backend
                await api.settleCallback(
                    wallet.address!,
                    channelId,
                    txHash,
                    '', // openTxHash (not needed for this update)
                    txHash // settleTxHash
                );

                toast.success(`Settlement transaction sent! Hash: ${txHash.slice(0, 10)}...`);
            }
            // Legacy flow (if backend still signed it)
            else if (responseData.success && !('requires_signing' in responseData.data)) {
                // legacy success handling
                toast.success('Channel settled successfully');
            }

            refreshBalance();
        } catch (error) {
            console.error('Settlement failed:', error);
            toast.error('Settlement failed.');
        }
    };

    const handleSettleOnChain = async (channelId: string) => {
        if (!wallet.address) return;
        try {
            // Use the REAL on-chain settlement endpoint - sends transaction to Base Sepolia
            const result = await api.settleChannelOnChain({ channel_id: channelId });
            const data = result.data;

            // Handle client-side signing
            const responseData = data as unknown as { success: boolean; data: Record<string, unknown> };
            if (responseData.success && responseData.data && 'requires_signing' in responseData.data && responseData.data.requires_signing === true) {
                const txData = responseData.data.tx_data as { to?: string; value?: string; data?: string; chainId?: number } | undefined;

                if (!txData || !txData.to) {
                    toast.error('Settlement data is incomplete. Please try again or contact support.');
                    return;
                }

                if (!window.ethereum) {
                    toast.error('MetaMask is required for on-chain settlement.');
                    return;
                }

                // Use Base Sepolia as fallback chain ID
                const chainIdHex = '0x' + (txData.chainId || 84532).toString(16);

                // Simple ETH transfer - NO data field to avoid "External transactions to internal accounts cannot include data" error
                const params = [
                    {
                        from: wallet.address,
                        to: txData.to,
                        value: txData.value || '0x0', // Settlement amount in wei
                        chainId: chainIdHex,
                    },
                ];

                const txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params,
                });

                console.log('On-chain settlement tx sent:', txHash);

                // Notify backend
                await api.settleCallback(
                    wallet.address,
                    channelId,
                    txHash as string,
                    '',
                    txHash as string
                );

                toast.success(`On-chain settlement complete!\nTx: ${txHash.slice(0, 10)}...`);
            }
            else if (responseData.success && responseData.data && 'tx_hash' in responseData.data) {
                const legacyData = responseData.data as { tx_hash: string; explorer_url: string };
                toast.success(
                    <span>
                        On-chain settlement complete!
                        <br />
                        <a href={legacyData.explorer_url} target="_blank" rel="noopener noreferrer" className="underline">
                            View transaction
                        </a>
                    </span>
                );
            }
            else {
                // No settlement data returned - might be mock mode or channel not ready
                toast('Settlement initiated. Check your wallet page for status updates.', { icon: 'ℹ️' });
            }
            refreshBalance();
        } catch (error: unknown) {
            console.error('On-chain settlement failed:', error);
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
                // MetaMask errors have code and message properties
                const errObj = error as { code?: number; message?: string; reason?: string };
                errorMessage = errObj.message || errObj.reason || JSON.stringify(error);
            }
            toast.error(`On-chain settlement failed: ${errorMessage}`);
        }
    };

    // Not connected state
    if (!wallet.address) {
        return (
            <div className="space-y-6 py-4">
                <Card className="border-0 shadow-none bg-transparent">
                    <CardHeader className="text-center px-0">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
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
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
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
                                refreshing...
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
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Yellow Network Channels</CardTitle>
                            <CardDescription>
                                Active payment channels for agent workflows
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleOpenChannel}
                            disabled={openingChannel}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold"
                        >
                            {openingChannel ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Open Channel
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {wallet.channels.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-700 rounded-lg">
                            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No active channels</p>
                            <p className="text-sm mt-2">Open a channel to start payments with agents</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {wallet.channels.map((channel) => (
                                <div key={channel.channelId}>
                                    {selectedChannel === channel.channelId ? (
                                        <PaymentChannelCard
                                            channelId={channel.channelId}
                                            onSettle={() => handleSettleChannel(channel.channelId)}
                                            onSettleOnChain={() => handleSettleOnChain(channel.channelId)}
                                            showTransactions={true}
                                        />
                                    ) : (
                                        <div
                                            className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-amber-500/30 cursor-pointer transition-colors"
                                            onClick={() => setSelectedChannel(channel.channelId)}
                                        >
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    Channel
                                                    <code className="text-xs text-gray-400">
                                                        {channel.channelId.slice(0, 12)}...
                                                    </code>
                                                </div>
                                                <div className="text-sm text-gray-400 mt-1">
                                                    Partner: {formatAddress(channel.partnerAddress)}
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div>
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
                                                <ArrowUpRight className="w-4 h-4 text-gray-500" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
