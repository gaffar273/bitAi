import { useState, useCallback, useEffect } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import { api } from '../services/api';
import type { WalletChannel, WalletState } from '../types';

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

const WALLET_STORAGE_KEY = 'roguecapital_wallet_address';

export function useWallet() {
    const [wallet, setWallet] = useState<WalletState>(() => {
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

    const switchToBaseSepolia = useCallback(async (): Promise<boolean> => {
        if (!window.ethereum) return false;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
            });
            return true;
        } catch (switchError: unknown) {
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

    const fetchWalletData = useCallback(async (address: string) => {
        try {
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

    useEffect(() => {
        const restoreConnection = async () => {
            const savedAddress = localStorage.getItem(WALLET_STORAGE_KEY);
            if (!savedAddress || !window.ethereum) return;

            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_accounts',
                }) as string[];

                if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
                    const data = await fetchWalletData(savedAddress);
                    setWallet(prev => ({
                        ...prev,
                        address: savedAddress,
                        ethBalance: data.ethBalance,
                        channels: data.channels,
                        network: 'Base Sepolia',
                    }));
                } else {
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

    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts: unknown) => {
            const accountList = accounts as string[];
            if (accountList.length === 0) {
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
            const switched = await switchToBaseSepolia();
            if (!switched) {
                throw new Error('Please switch to Base Sepolia network to continue');
            }

            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            }) as string[];

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }

            const address = accounts[0];

            const message = `Sign this message to verify your wallet ownership.\n\nNetwork: Base Sepolia\nTimestamp: ${Date.now()}`;

            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address],
            }) as string;

            const connectResponse = await api.connectWallet({
                address,
                signature,
                message,
            });

            if (!connectResponse.data.success) {
                throw new Error('Backend verification failed');
            }

            localStorage.setItem(WALLET_STORAGE_KEY, address);

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

    return {
        wallet,
        connectWallet,
        disconnectWallet,
        refreshBalance
    };
}
