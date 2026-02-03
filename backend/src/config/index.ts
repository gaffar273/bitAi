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
};
