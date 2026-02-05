import { ethers } from 'ethers';
import { config } from '../config';

// Create wallet if private key is provided
export const getWallet = (): ethers.Wallet | null => {
    if (!config.privateKey) {
        console.warn('No private key configured');
        return null;
    }
    return new ethers.Wallet(config.privateKey);
};

// Generate a new wallet for an agent
export const generateAgentWallet = (): { address: string; privateKey: string } => {
    const wallet = ethers.Wallet.createRandom();
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
    };
};

// Sign a message with a wallet
export const signMessage = async (privateKey: string, message: string): Promise<string> => {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
};

// Verify a signed message
export const verifyMessage = (message: string, signature: string): string => {
    return ethers.verifyMessage(message, signature);
};

// Format ETH amount (18 decimals)
export const parseEth = (amount: number): bigint => {
    return ethers.parseUnits(amount.toString(), 18);
};

export const formatEth = (amount: bigint): number => {
    return parseFloat(ethers.formatUnits(amount, 18));
};

// Generate unique ID
export const generateId = (): string => {
    return ethers.hexlify(ethers.randomBytes(16));
};
