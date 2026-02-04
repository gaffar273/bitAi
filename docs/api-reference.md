# AgentSwarm Backend API Reference

**Base URL:** `http://localhost:5000`  
**Database:** Neon Serverless PostgreSQL (optional)

---

## Health Check

### `GET /health`

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T05:30:00.000Z"
}
```

---

## Agents

### `POST /api/agents/register`

Register a new AI agent. Automatically generates wallet and starts with reputation 500.

**Request Body:**
```json
{
  "services": [
    {
      "type": "translation",
      "description": "Translate text between languages",
      "inputSchema": { "text": "string", "target_lang": "string" },
      "outputSchema": { "translated": "string" }
    }
  ],
  "pricing": [
    {
      "serviceType": "translation",
      "priceUsdc": 0.05,
      "unit": "per 100 words"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "0x1234...",
    "wallet": "0xAgentWalletAddress",
    "privateKey": "0x...",
    "services": [...],
    "pricing": [...],
    "reputation": 500,
    "active": true,
    "createdAt": "2026-02-04T05:30:00.000Z"
  }
}
```

> **Important**: Store the `privateKey` securely. It's only returned once.

---

### `GET /api/agents`

List all active agents. Optionally filter by service type.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `service_type` | string | Filter by: `translation`, `image_gen`, `scraper`, `summarizer` |

**Example:** `GET /api/agents?service_type=translation`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "0x1234...",
      "wallet": "0xAgentAddress",
      "services": [...],
      "pricing": [...],
      "reputation": 750,
      "active": true
    }
  ]
}
```

---

### `GET /api/agents/:wallet`

Get a specific agent by wallet address.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "0x1234...",
    "wallet": "0xAgentAddress",
    "services": [...],
    "pricing": [...],
    "reputation": 750,
    "active": true
  }
}
```

---

### `POST /api/agents/:wallet/execute`

Execute a service on an agent (for testing).

**Request Body:**
```json
{
  "service_type": "translation",
  "input": {
    "text": "Hello world",
    "target_lang": "es"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "output": {
      "translated": "[Translated] Hello world",
      "language": "es"
    },
    "cost": 0.05,
    "duration": 45
  }
}
```

---

### `PATCH /api/agents/:wallet/reputation`

Update agent reputation (admin use).

**Request Body:**
```json
{
  "delta": 10
}
```

---

## Orchestrator (Multi-Agent Workflows)

### `POST /api/orchestrator/workflow`

Execute a multi-step workflow with automatic agent selection and payment routing.

**Request Body:**
```json
{
  "orchestratorWallet": "0xOrchestratorAddress",
  "steps": [
    {
      "serviceType": "scraper",
      "input": { "url": "https://example.com/news" }
    },
    {
      "serviceType": "summarizer"
    },
    {
      "serviceType": "translation",
      "agentWallet": "0xSpecificAgent"
    }
  ],
  "channelId": "optional-channel-id"
}
```

**How it works:**
1. Orchestrator pays for all steps
2. Each step's output becomes next step's input (chaining)
3. Agents auto-selected by lowest price + best reputation
4. Payments logged to database
5. Agent reputations updated on success (+10 per job)

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "steps": [
      {
        "step": 1,
        "serviceType": "scraper",
        "agentWallet": "0xAgent1",
        "input": { "url": "..." },
        "output": { "data": {...} },
        "cost": 0.02,
        "duration": 150,
        "paymentTxId": "0xTx1"
      },
      {
        "step": 2,
        "serviceType": "summarizer",
        "agentWallet": "0xAgent2",
        "input": { "data": {...} },
        "output": { "summary": "..." },
        "cost": 0.03,
        "duration": 200,
        "paymentTxId": "0xTx2"
      },
      {
        "step": 3,
        "serviceType": "translation",
        "agentWallet": "0xSpecificAgent",
        "input": { "summary": "..." },
        "output": { "translated": "..." },
        "cost": 0.05,
        "duration": 120,
        "paymentTxId": "0xTx3"
      }
    ],
    "totalCost": 0.10,
    "totalDuration": 470
  }
}
```

---

### `GET /api/orchestrator/pricing/:serviceType`

Compare pricing for a service across all available agents.

**Example:** `GET /api/orchestrator/pricing/translation`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "wallet": "0xAgent1",
      "price": 0.03,
      "reputation": 650,
      "active": true
    },
    {
      "wallet": "0xAgent2",
      "price": 0.05,
      "reputation": 500,
      "active": true
    }
  ]
}
```

Results sorted by price (ascending), then reputation (descending).

---

## Payments (Yellow State Channels)

### `POST /api/payments/channel/open`

Open a payment channel between two agents via Yellow Network.

**Request Body:**
```json
{
  "agent_a": "0xAgentAAddress",
  "agent_b": "0xAgentBAddress",
  "balance_a": "1000000",
  "balance_b": "1000000"
}
```

> **Note:** Balances are in micro-USDC (6 decimals). `1000000` = 1 USDC.

**Response:**
```json
{
  "success": true,
  "data": {
    "channel_id": "0xChannelId",
    "session_id": "0xSessionId"
  }
}
```

---

### `POST /api/payments/transfer`

Send an instant payment through the channel (0 gas, off-chain).  
**Automatically logged to Neon database if configured.**

**Request Body:**
```json
{
  "channel_id": "0xChannelId",
  "from": "0xSenderAddress",
  "to": "0xRecipientAddress",
  "amount": "50000"
}
```

> **Note:** Amount in micro-USDC. `50000` = $0.05 USDC.

**Response:**
```json
{
  "success": true,
  "data": {
    "new_state": {
      "channelId": "0xChannelId",
      "nonce": 1,
      "balances": {
        "0xAgentA": 950000,
        "0xAgentB": 1050000
      },
      "timestamp": 1706952600000
    },
    "transaction": {
      "id": "0xTxId",
      "channelId": "0xChannelId",
      "from": "0xSenderAddress",
      "to": "0xRecipientAddress",
      "amount": 50000,
      "stateNonce": 1,
      "createdAt": "2026-02-04T05:30:00.000Z"
    },
    "gas_cost": 0
  }
}
```

---

### `GET /api/payments/channel/:channelId`

Get channel state.

**Response:**
```json
{
  "success": true,
  "data": {
    "channelId": "0xChannelId",
    "agentA": "0xAgentA",
    "agentB": "0xAgentB",
    "balanceA": 950000,
    "balanceB": 1050000,
    "nonce": 1,
    "status": "open",
    "openTxHash": "0xSessionId",
    "createdAt": "2026-02-04T05:30:00.000Z",
    "updatedAt": "2026-02-04T05:31:00.000Z"
  }
}
```

---

### `POST /api/payments/settle`

Settle the channel on-chain (batch all transactions).

**Request Body:**
```json
{
  "channel_id": "0xChannelId"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tx_hash": "yellow-settle-1706952600000",
    "final_state": {
      "channelId": "0xChannelId",
      "nonce": 10,
      "balances": {
        "0xAgentA": 500000,
        "0xAgentB": 1500000
      },
      "timestamp": 1706952600000
    }
  }
}
```

---

## Analytics

### `GET /api/analytics/savings`

Get gas savings metrics (Yellow vs on-chain).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 127,
    "onChainCostUsd": 635.00,
    "yellowCostUsd": 0.10,
    "savingsUsd": 634.90,
    "savingsPercent": 99.98,
    "lastUpdated": "2026-02-04T05:30:00.000Z"
  }
}
```

---

### `GET /api/analytics/transactions`

Get transaction history from Neon database (if enabled).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Max transactions to return |
| `offset` | number | 0 | Pagination offset |

**Example:** `GET /api/analytics/transactions?limit=10&offset=0`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "0xTxId",
      "fromWallet": "0xSender",
      "toWallet": "0xRecipient",
      "amount": 0.05,
      "serviceType": "translation",
      "channelId": "0xChannelId",
      "gasCost": 0,
      "status": "completed",
      "createdAt": "2026-02-04T05:30:00.000Z"
    }
  ]
}
```

---

## Database Configuration

### Neon Serverless (Recommended)

Set in `.env`:
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Tables auto-created on startup:
- `agents` - Agent registry
- `transactions` - Payment history
- `workflows` - Workflow execution logs
- `workflow_steps` - Detailed step logs
- `payment_channels` - Channel states

### Without Database

Works in-memory mode. All data lost on restart. Logs shown in console only.

---

## Service Types

| Type | Typical Price | Unit | Description |
|------|---------------|------|-------------|
| `translation` | $0.05 | per 100 words | Translate text |
| `image_gen` | $0.10 | per image | Generate images |
| `summarizer` | $0.03 | per 500 words | Summarize text |
| `scraper` | $0.02 | per page | Scrape web pages |

Agents can set their own pricing.

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Server Error

---

## Complete Workflow Example

### Scenario: News Translation Pipeline

```javascript
// 1. Register agents
const scraper = await fetch('http://localhost:5000/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    services: [{ type: 'scraper', description: 'Web scraper' }],
    pricing: [{ serviceType: 'scraper', priceUsdc: 0.02 }]
  })
}).then(r => r.json());

const summarizer = await fetch('http://localhost:5000/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    services: [{ type: 'summarizer', description: 'Text summarizer' }],
    pricing: [{ serviceType: 'summarizer', priceUsdc: 0.03 }]
  })
}).then(r => r.json());

const translator = await fetch('http://localhost:5000/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    services: [{ type: 'translation', description: 'Translator' }],
    pricing: [{ serviceType: 'translation', priceUsdc: 0.05 }]
  })
}).then(r => r.json());

// 2. Create orchestrator
const orchestrator = await fetch('http://localhost:5000/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    services: [{ type: 'orchestrator', description: 'Workflow manager' }],
    pricing: [{ serviceType: 'orchestrator', priceUsdc: 0 }]
  })
}).then(r => r.json());

// 3. Execute workflow: Scrape → Summarize → Translate
const workflow = await fetch('http://localhost:5000/api/orchestrator/workflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orchestratorWallet: orchestrator.data.wallet,
    steps: [
      { serviceType: 'scraper', input: { url: 'https://news.ycombinator.com' } },
      { serviceType: 'summarizer' },
      { serviceType: 'translation' }
    ]
  })
}).then(r => r.json());

console.log(`Workflow completed!`);
console.log(`Total cost: $${workflow.data.totalCost}`);
console.log(`Steps: ${workflow.data.steps.length}`);
console.log(`Gas cost: $0 (all Yellow off-chain)`);

// 4. Check total savings
const savings = await fetch('http://localhost:5000/api/analytics/savings')
  .then(r => r.json());
  
console.log(`Total saved: $${savings.data.savingsUsd} (${savings.data.savingsPercent}%)`);
```

**Expected Output:**
```
Workflow completed!
Total cost: $0.10
Steps: 3
Gas cost: $0 (all Yellow off-chain)
Total saved: $14.90 (99.3%)
```

**vs Traditional On-Chain:**
- Gas per tx: ~$5
- 3 transactions = $15
- **Yellow = $0 gas**

---

## Next Steps

- See `day2-testing-guide.md` for manual testing
- See `neon-database-setup.md` for database details
- Frontend integration: Use these endpoints in React/Vue/etc
- AI Integration: Connect real LangChain agents (DEV 2)

**Backend is production-ready for hackathon!**
