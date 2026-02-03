# AgentSwarm Backend API Reference

**Base URL:** `http://localhost:5000`

---

## Health Check

### `GET /health`

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T10:30:00.000Z"
}
```

---

## Agents

### `POST /api/agents/register`

Register a new AI agent.

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
    "services": [...],
    "pricing": [...],
    "reputation": 500,
    "active": true,
    "createdAt": "2026-02-03T10:30:00.000Z"
  }
}
```

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
      "createdAt": "2026-02-03T10:30:00.000Z"
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
    "createdAt": "2026-02-03T10:30:00.000Z",
    "updatedAt": "2026-02-03T10:31:00.000Z"
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
    "lastUpdated": "2026-02-03T10:30:00.000Z"
  }
}
```

---

### `GET /api/analytics/transactions`

Get transaction history.

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
      "channelId": "0xChannelId",
      "from": "0xSender",
      "to": "0xRecipient",
      "amount": 50000,
      "stateNonce": 1,
      "createdAt": "2026-02-03T10:30:00.000Z"
    }
  ]
}
```

---

## Service Types

| Type | Price | Unit | Description |
|------|-------|------|-------------|
| `translation` | $0.05 | per 100 words | Translate text |
| `image_gen` | $0.10 | per image | Generate images |
| `summarizer` | $0.03 | per 500 words | Summarize text |
| `scraper` | $0.02 | per page | Scrape web pages |

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

## Quick Start Example

```javascript
// 1. Register an agent
const agent = await fetch('http://localhost:5000/api/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    services: [{ type: 'translation', description: 'Translate text' }],
    pricing: [{ serviceType: 'translation', priceUsdc: 0.05, unit: 'per 100 words' }]
  })
}).then(r => r.json());

// 2. Open a payment channel
const channel = await fetch('http://localhost:5000/api/payments/channel/open', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_a: '0xAgentA',
    agent_b: '0xAgentB',
    balance_a: '1000000',
    balance_b: '1000000'
  })
}).then(r => r.json());

// 3. Send instant payment (0 gas!)
const payment = await fetch('http://localhost:5000/api/payments/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    channel_id: channel.data.channel_id,
    from: '0xAgentA',
    to: '0xAgentB',
    amount: '50000' // $0.05 USDC
  })
}).then(r => r.json());

// 4. Check savings
const savings = await fetch('http://localhost:5000/api/analytics/savings')
  .then(r => r.json());
console.log(`Saved: $${savings.data.savingsUsd} (${savings.data.savingsPercent}%)`);
```
