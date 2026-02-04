import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Yellow Network (ClearNode)
    yellowWsUrl: process.env.YELLOW_WS_URL || 'wss://clearnet-sandbox.yellow.com/ws',

    // Wallet
    privateKey: process.env.PRIVATE_KEY || '',

    // Database (Neon Serverless or PostgreSQL)
    databaseUrl: process.env.DATABASE_URL || '',
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: parseInt(process.env.DB_PORT || '5432', 10),
    dbName: process.env.DB_NAME || 'agentswarm',
    dbUser: process.env.DB_USER || 'postgres',
    dbPassword: process.env.DB_PASSWORD || '',
    enableDatabase: process.env.ENABLE_DATABASE === 'true' || !!process.env.DATABASE_URL,
};

