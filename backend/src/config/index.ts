import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Yellow Network (ClearNode)
    yellowWsUrl: process.env.YELLOW_WS_URL || 'wss://clearnet-sandbox.yellow.com/ws',

    // Wallet (for server-side signing)
    privateKey: process.env.PRIVATE_KEY || '',

    // Base Sepolia Testnet (for on-chain settlement)
    baseSepolia: {
        rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
        chainId: parseInt(process.env.BASE_SEPOLIA_CHAIN_ID || '84532', 10),
        explorer: process.env.BASE_SEPOLIA_EXPLORER || 'https://sepolia.basescan.org',
    },

    // USDC Contract on Base Sepolia
    usdcContract: process.env.USDC_CONTRACT_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',

    // Default orchestrator address for wallet channels
    defaultOrchestratorAddress: process.env.DEFAULT_ORCHESTRATOR_ADDRESS || '',

    // Database (Neon Serverless or PostgreSQL)
    databaseUrl: process.env.DATABASE_URL || '',
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: parseInt(process.env.DB_PORT || '5432', 10),
    dbName: process.env.DB_NAME || 'agentswarm',
    dbUser: process.env.DB_USER || 'postgres',
    dbPassword: process.env.DB_PASSWORD || '',
    enableDatabase: process.env.ENABLE_DATABASE === 'true' || !!process.env.DATABASE_URL,
};

