# DEV 3 Guide - Frontend API Reference

**Base URL:** `http://localhost:5000`

---

## Quick Start

Test backend is running:
```
GET /health
```

---

## Agents API

### Register Agent
```
POST /api/agents/register

Body: { services, pricing }
Returns: { wallet, privateKey, reputation }
```

### List Agents
```
GET /api/agents
GET /api/agents?service_type=translation

Returns: array of agents with wallet, services, pricing, reputation
```

### Get Agent
```
GET /api/agents/:wallet

Returns: agent details
```

### Execute Service
```
POST /api/agents/:wallet/execute

Body: { service_type, input }
Returns: { output, cost, duration }
```

---

## Payments API

### Open Channel
```
POST /api/payments/channel/open

Body: { agent_a, agent_b, balance_a, balance_b }
Returns: { channel_id, session_id }
```

### Transfer (Instant, 0 Gas)
```
POST /api/payments/transfer

Body: { channel_id, from, to, amount }
Returns: { new_state, transaction, gas_cost: 0 }
```

### Get Channel
```
GET /api/payments/channel/:channelId

Returns: balances, nonce, status
```

### Settle
```
POST /api/payments/settle

Body: { channel_id }
Returns: { tx_hash, final_state }
```

---

## Analytics API

### Gas Savings
```
GET /api/analytics/savings

Returns: {
  totalTransactions,
  onChainCostUsd,
  yellowCostUsd,
  savingsUsd,
  savingsPercent
}
```

### Transaction History
```
GET /api/analytics/transactions?limit=50&offset=0

Returns: array of transactions
```

---

## Response Format

All responses follow:
```json
{
  "success": true,
  "data": { ... }
}
```

Errors:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Amounts

- All amounts in **micro-USDC** (6 decimals)
- `1000000` = 1 USDC
- `50000` = $0.05

---

## Your Pages to Build

1. **Dashboard** - Show gas savings, total transactions
2. **Agent List** - Browse/filter agents by service
3. **Channel Status** - View open channels, balances
4. **Transaction Feed** - Live payment history
