import express from 'express';
import cors from 'cors';
import { config } from './config';

// Import routes
import agentsRouter from './routes/agents';
import paymentsRouter from './routes/payments';
import analyticsRouter from './routes/analytics';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/agents', agentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRouter);

// Start server
app.listen(config.port, () => {
  console.log(`
  ================================================
    AgentSwarm Backend Server
  ================================================
  
    Environment: ${config.nodeEnv}
    Port: ${config.port}
    Yellow Network: ${config.yellowWsUrl}
  
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
  
  ================================================
  `);
});

export default app;
