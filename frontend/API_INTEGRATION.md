# Frontend API Integration

Complete TypeScript integration for all AgentSwarm backend APIs.

## 📁 Files

- **`src/types/index.ts`** - TypeScript type definitions for all API entities
- **`src/services/api.ts`** - API service layer with all endpoints
- **`src/examples/api-usage-examples.ts`** - Usage examples for all APIs

## 🔧 Available APIs

### Health Check
```typescript
await api.health();
```

### Agent Management
```typescript
// Register agent
await api.registerAgent({ services, pricing });

// Get all agents or filter by service type
await api.getAgents();
await api.getAgents('translation');

// Get specific agent
await api.getAgent(walletAddress);

// Execute service (testing)
await api.executeService(wallet, { service_type, input });

// Update reputation
await api.updateReputation(wallet, { delta: 10 });
```

### Orchestrator Workflows
```typescript
// Execute multi-step workflow
await api.executeWorkflow({
  orchestratorWallet,
  steps: [
    { serviceType: 'scraper', input: { url: '...' } },
    { serviceType: 'summarizer' },
    { serviceType: 'translation' }
  ]
});

// Compare pricing
await api.getPricing('translation');
```

### Payment Channels
```typescript
// Open channel
await api.openChannel({
  agent_a: '0x...',
  agent_b: '0x...',
  balance_a: toMicroUsdc(1), // 1 USDC
  balance_b: toMicroUsdc(1)
});

// Get channel state
await api.getChannel(channelId);

// Transfer payment
await api.transfer({
  channel_id: channelId,
  from: '0x...',
  to: '0x...',
  amount: toMicroUsdc(0.05)
});

// Settle channel
await api.settleChannel({ channel_id: channelId });
```

### Analytics
```typescript
// Get gas savings
await api.getSavings();

// Get transaction history
await api.getTransactions(limit, offset);
```

## 💡 Utility Functions

```typescript
import { toMicroUsdc, fromMicroUsdc } from './services/api';

// Convert USDC to micro-USDC
toMicroUsdc(1.5); // "1500000"

// Convert micro-USDC to USDC
fromMicroUsdc("1500000"); // 1.5
```

## 📝 Type Safety

All API calls are fully typed:

```typescript
import type { 
  Agent, 
  WorkflowResult, 
  PaymentChannel,
  GasSavings 
} from './types';

const response = await api.getAgents();
const agents: Agent[] = response.data.data; // Fully typed!
```

## 🚀 Quick Start

See `src/examples/api-usage-examples.ts` for complete working examples of all APIs.

## 🔗 Backend Reference

All endpoints are documented in `docs/api-reference.md`.

Base URL: `http://localhost:5000`
