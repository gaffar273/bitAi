import express from 'express';
import cors from 'cors';
import { config } from './config';

// Import routes
import agentsRouter from './routes/agents';
import paymentsRouter from './routes/payments';
import analyticsRouter from './routes/analytics';
import orchestratorRouter from './routes/orchestrator';
import walletRouter from './routes/wallet';

// Import database service
import { initDatabase } from './services/DatabaseService';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
import filesRouter from './routes/files';

// API Routes
app.use('/api/agents', agentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/orchestrator', orchestratorRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/files', filesRouter);

import { YellowService } from './services/YellowService';

// Start server with async initialization
async function startServer() {
  // Initialize database if configured
  if (config.databaseUrl || config.enableDatabase) {
    console.log('[Database] Initializing schema...');
    try {
      await initDatabase();

      // Initialize YellowService (load channels)
      await YellowService.init();
    } catch (error) {
      console.error('[Database] Failed to initialize:', error);
      console.log('[Server] Continuing without database...');
    }
  } else {
    console.log('[Database] No DATABASE_URL configured - running in memory mode');
  }

  app.listen(config.port, () => {
    console.log(`
  ================================================
    AgentSwarm Backend Server
  ================================================
  
    Environment: ${config.nodeEnv}
    Port: ${config.port}
    Yellow Network: ${config.yellowWsUrl}
    Database: ${config.databaseUrl ? 'Neon (connected)' : 'In-memory'}
  
  Available endpoints:
    - GET  /health
    - POST /api/agents/register
    - GET  /api/agents
    - GET  /api/agents/:wallet
    - POST /api/payments/channel/open
    - POST /api/payments/transfer
    - POST /api/payments/settle
    - GET  /api/analytics/savings
    - GET  /api/analytics/transactions
    - POST /api/orchestrator/workflow
    - GET  /api/orchestrator/pricing/:serviceType
    - POST /api/wallet/connect
    - GET  /api/wallet/:address/balance
    - POST /api/wallet/:address/fund-channel
  
  ================================================
  `);
  });
}

startServer();

export default app;
