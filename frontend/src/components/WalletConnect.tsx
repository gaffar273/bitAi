import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrowserProvider, formatEther } from 'ethers';
import { api } from '../services/api';
import type { WalletChannel } from '../types';

// Base Sepolia Testnet Configuration
const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532 in hex
const BASE_SEPOLIA_CONFIG = {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    chainName: 'Base Sepolia',
    nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
};

const WALLET_STORAGE_KEY = 'agentswarm_wallet_address';

interface WalletState {
    address: string | null;
    ethBalance: string;
    channels: WalletChannel[];
    isConnecting: boolean;
    isRefreshing: boolean;
    error: string | null;
    network: string | null;
}

declare global {
    interface Window {
        ethereum?: {
            isMetaMask?: boolean;
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            on: (event: string, callback: (...args: unknown[]) => void) => void;
            removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
        };
    }
}

export function WalletConnect() {
    const [wallet, setWallet] = useState<WalletState>(() => {
        // Initialize from localStorage if available
        const savedAddress = typeof window !== 'undefined'
            ? localStorage.getItem(WALLET_STORAGE_KEY)
            : null;
        return {
            address: savedAddress,
            ethBalance: '0',
            channels: [],
            isConnecting: false,
            isRefreshing: false,
            error: null,
            network: savedAddress ? 'Base Sepolia' : null,
        };
    });
    const [copied, setCopied] = useState(false);

    const isMetaMaskInstalled = typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask);

    // Switch to Base Sepolia network
    const switchToBaseSepolia = useCallback(async (): Promise<boolean> => {
        if (!window.ethereum) return false;

        try {
            // Try to switch to Base Sepolia
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
            });
            return true;
        } catch (switchError: unknown) {
            // If the chain hasn't been added, add it
            if (switchError && typeof switchError === 'object' && 'code' in switchError && switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BASE_SEPOLIA_CONFIG],
                    });
                    return true;
                } catch {
                    return false;
                }
            }
            return false;
        }
    }, []);

    // Fetch balances and channels for an address
    const fetchWalletData = useCallback(async (address: string) => {
        try {
            // Get ETH balance from provider
            let ethBalance = '0';
            if (window.ethereum) {
                try {
                    const provider = new BrowserProvider(window.ethereum);
                    const balance = await provider.getBalance(address);
                    ethBalance = formatEther(balance);
                } catch (e) {
                    console.error('Failed to get ETH balance from provider:', e);
                }
            }

            // Get channels
            let channels: WalletChannel[] = [];
            try {
                const channelsResponse = await api.getWalletChannels(address);
                channels = channelsResponse.data.data.channels;
            } catch {
                // Channels might not exist yet
            }

            return { ethBalance, channels };
        } catch (err) {
            console.error('Failed to fetch wallet data:', err);
            return { ethBalance: '0', channels: [] };
        }
    }, []);

    // Restore connection on mount if we have a saved address
    useEffect(() => {
        const restoreConnection = async () => {
            const savedAddress = localStorage.getItem(WALLET_STORAGE_KEY);
            if (!savedAddress || !window.ethereum) return;

            try {
                // Check if the account is still connected
                const accounts = await window.ethereum.request({
                    method: 'eth_accounts',
                }) as string[];

                if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
                    // Account is still connected, fetch data
                    const data = await fetchWalletData(savedAddress);
                    setWallet(prev => ({
                        ...prev,
                        address: savedAddress,
                        ethBalance: data.ethBalance,
                        channels: data.channels,
                        network: 'Base Sepolia',
                    }));
                } else {
                    // Account changed or disconnected, clear storage
                    localStorage.removeItem(WALLET_STORAGE_KEY);
                    setWallet(prev => ({
                        ...prev,
                        address: null,
                        network: null,
                    }));
                }
            } catch (err) {
                console.error('Failed to restore connection:', err);
            }
        };

        restoreConnection();
    }, [fetchWalletData]);

    // Listen for account changes
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts: unknown) => {
            const accountList = accounts as string[];
            if (accountList.length === 0) {
                // User disconnected
                localStorage.removeItem(WALLET_STORAGE_KEY);
                setWallet({
                    address: null,
                    ethBalance: '0',
                    channels: [],
                    isConnecting: false,
                    isRefreshing: false,
                    error: null,
                    network: null,
                });
            } else if (wallet.address && accountList[0].toLowerCase() !== wallet.address.toLowerCase()) {
                // Account changed
                localStorage.removeItem(WALLET_STORAGE_KEY);
                setWallet({
                    address: null,
                    ethBalance: '0',
                    channels: [],
                    isConnecting: false,
                    isRefreshing: false,
                    error: null,
                    network: null,
                });
            }
        };

        const handleChainChanged = () => {
            // Reload to ensure we're on the right chain
            window.location.reload();
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum?.removeListener('chainChanged', handleChainChanged);
        };
    }, [wallet.address]);

    const connectWallet = useCallback(async () => {
        if (!window.ethereum) {
            setWallet(prev => ({ ...prev, error: 'MetaMask is not installed' }));
            return;
        }

        setWallet(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            // First, switch to Base Sepolia
            const switched = await switchToBaseSepolia();
            if (!switched) {
                throw new Error('Please switch to Base Sepolia network to continue');
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            }) as string[];

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }

            const address = accounts[0];

            // Create message for signing
            const message = `Sign this message to verify your wallet ownership.\n\nNetwork: Base Sepolia\nTimestamp: ${Date.now()}`;

            // Request signature
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address],
            }) as string;

            // Verify with backend
            const connectResponse = await api.connectWallet({
                address,
                signature,
                message,
            });

            if (!connectResponse.data.success) {
                throw new Error('Backend verification failed');
            }

            // Save to localStorage for persistence
            localStorage.setItem(WALLET_STORAGE_KEY, address);

            // Fetch wallet data
            const data = await fetchWalletData(address);

            setWallet({
                address,
                ethBalance: data.ethBalance,
                channels: data.channels,
                isConnecting: false,
                isRefreshing: false,
                error: null,
                network: 'Base Sepolia',
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            setWallet(prev => ({
                ...prev,
                isConnecting: false,
                error: errorMessage,
            }));
        }
    }, [switchToBaseSepolia, fetchWalletData]);

    const refreshBalance = useCallback(async () => {
        if (!wallet.address || !window.ethereum) return;

        setWallet(prev => ({ ...prev, isRefreshing: true }));

        try {
            const data = await fetchWalletData(wallet.address);

            setWallet(prev => ({
                ...prev,
                ethBalance: data.ethBalance,
                channels: data.channels,
                isRefreshing: false,
            }));
        } catch (err) {
            console.error('Failed to refresh balance:', err);
            setWallet(prev => ({ ...prev, isRefreshing: false }));
        }
    }, [wallet.address, fetchWalletData]);

    const disconnectWallet = useCallback(() => {
        localStorage.removeItem(WALLET_STORAGE_KEY);
        setWallet({
            address: null,
            ethBalance: '0',
            channels: [],
            isConnecting: false,
            isRefreshing: false,
            error: null,
            network: null,
        });
    }, []);

    const copyAddress = useCallback(() => {
        if (wallet.address) {
            navigator.clipboard.writeText(wallet.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [wallet.address]);

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Not connected state
    if (!wallet.address) {
        return (
            <div className="max-w-7xl mx-auto p-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-bold mb-2">🔗 Connect Wallet</h1>
                    <p className="text-gray-400">Connect your MetaMask wallet to interact with AgentSwarm</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md mx-auto"
                >
                    <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
                        {!isMetaMaskInstalled ? (
                            <>
                                <div className="text-6xl mb-6">🦊</div>
                                <h2 className="text-2xl font-semibold mb-4">MetaMask Required</h2>
                                <p className="text-gray-400 mb-6">
                                    Please install MetaMask browser extension to connect your wallet.
                                </p>
                                <motion.a
                                    href="https://metamask.io/download/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="inline-block px-8 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold transition"
                                >
                                    Install MetaMask
                                </motion.a>
                            </>
                        ) : (
                            <>
                                <div className="text-6xl mb-6">🦊</div>
                                <h2 className="text-2xl font-semibold mb-4">Connect MetaMask</h2>
                                <p className="text-gray-400 mb-2">
                                    Click below to connect your wallet to Base Sepolia testnet.
                                </p>
                                <p className="text-xs text-blue-400 mb-6">
                                    ⚡ Network will be added automatically if not configured
                                </p>

                                {wallet.error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400"
                                    >
                                        {wallet.error}
                                    </motion.div>
                                )}

                                <motion.button
                                    onClick={connectWallet}
                                    disabled={wallet.isConnecting}
                                    whileHover={{ scale: wallet.isConnecting ? 1 : 1.05 }}
                                    whileTap={{ scale: wallet.isConnecting ? 1 : 0.95 }}
                                    className={`w-full px-8 py-4 rounded-xl font-semibold transition text-lg ${wallet.isConnecting
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/30'
                                        }`}
                                >
                                    {wallet.isConnecting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Connecting...
                                        </span>
                                    ) : (
                                        '🔗 Connect Wallet'
                                    )}
                                </motion.button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    // Connected state
    return (
        <div className="max-w-7xl mx-auto p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-4xl font-bold mb-2">🔗 My Wallet</h1>
                <p className="text-gray-400">Manage your wallet and Yellow Network channels</p>
            </motion.div>

            {/* Wallet Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 mb-8"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-2xl">
                            🦊
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-gray-400">Connected Address</span>
                                {wallet.network && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                                        {wallet.network}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="text-lg font-mono">{formatAddress(wallet.address)}</code>
                                <motion.button
                                    onClick={copyAddress}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="text-gray-400 hover:text-white transition"
                                    title="Copy address"
                                >
                                    {copied ? '✓' : '📋'}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                    <motion.button
                        onClick={disconnectWallet}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                    >
                        Disconnect
                    </motion.button>
                </div>

                {/* Balances */}
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                    <div className="text-sm text-gray-400 mb-1">ETH Balance (Base Sepolia)</div>
                    <div className="text-2xl font-bold text-blue-400">
                        {parseFloat(wallet.ethBalance).toFixed(4)} ETH
                    </div>
                </div>

                <motion.button
                    onClick={refreshBalance}
                    disabled={wallet.isRefreshing}
                    whileHover={{ scale: wallet.isRefreshing ? 1 : 1.02 }}
                    whileTap={{ scale: wallet.isRefreshing ? 1 : 0.98 }}
                    className={`w-full py-2 rounded-lg text-sm transition ${wallet.isRefreshing
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                >
                    {wallet.isRefreshing ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Refreshing...
                        </span>
                    ) : (
                        '🔄 Refresh Balances'
                    )}
                </motion.button>
            </motion.div>

            {/* Yellow Network Channels */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <span className="text-yellow-400">⚡</span>
                        Yellow Network Channels
                    </h2>
                    <div className="text-sm text-gray-400">
                        {wallet.channels.length} active channel{wallet.channels.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {wallet.channels.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-4">📡</div>
                        <h3 className="text-lg font-medium mb-2">No Active Channels</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Open a payment channel to enable instant, gas-free transactions with agents.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl font-semibold transition"
                        >
                            + Open New Channel
                        </motion.button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {wallet.channels.map((channel, index) => (
                            <motion.div
                                key={channel.channelId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-gray-700/50 rounded-xl p-4 flex items-center justify-between"
                            >
                                <div>
                                    <div className="font-mono text-sm text-gray-300">
                                        {formatAddress(channel.partnerAddress)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Channel: {channel.channelId.slice(0, 8)}...
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-blue-400 font-semibold">
                                        {(channel.balance / 1e18).toFixed(4)} ETH
                                    </div>
                                    <div className={`text-xs ${channel.status === 'open' ? 'text-green-500' : 'text-yellow-500'
                                        }`}>
                                        {channel.status.toUpperCase()}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Info Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="text-2xl mb-2">⚡</div>
                    <h3 className="font-semibold mb-1">Instant Payments</h3>
                    <p className="text-sm text-gray-400">Zero-latency transactions through state channels</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="text-2xl mb-2">💰</div>
                    <h3 className="font-semibold mb-1">99% Gas Savings</h3>
                    <p className="text-sm text-gray-400">Only pay gas when settling channels on-chain</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="text-2xl mb-2">🔒</div>
                    <h3 className="font-semibold mb-1">Secure</h3>
                    <p className="text-sm text-gray-400">Non-custodial with cryptographic guarantees</p>
                </div>
            </motion.div>
        </div>
    );
}
