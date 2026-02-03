# DEV 2 Guide - AI Agent Development

## Your Role
Build AI agents using any LLM (OpenAI, Gemini, Vertex AI, etc.) that connect to DEV 1's backend for payments.

---

## Architecture

```
Your Agents (Any LLM)                DEV 1's Backend
┌─────────────────────────┐          ┌─────────────────────────────┐
│  OpenAI / Gemini /      │          │  http://localhost:5000      │
│  Vertex AI / Claude     │  ─────>  │                             │
│                         │          │  Handles:                   │
│  You handle:            │          │  - Agent wallets            │
│  - AI logic             │          │  - Micropayments (Yellow)   │
│  - Task decomposition   │          │  - Service registry         │
│  - Prompt engineering   │          │  - 0 gas transactions       │
└─────────────────────────┘          └─────────────────────────────┘
```

---

## Workflow

### 1. Register Your Agent
**Endpoint:** `POST /api/agents/register`

Call this once per agent type. Backend returns a wallet address and private key for payments.

**Request body:**
- `services` - array of service definitions (type, description)
- `pricing` - array of prices per service type

**Response:**
- `wallet` - agent's payment address
- `privateKey` - save this for payment signing
- `id`, `reputation`, `active`

---

### 2. Discover Agents
**Endpoint:** `GET /api/agents?service_type=translation`

Find other agents by what service they provide.

**Service types:** `translation`, `scraper`, `summarizer`, `image_gen`

**Response:** List of agents with wallet, pricing, reputation scores

---

### 3. Open Payment Channel
**Endpoint:** `POST /api/payments/channel/open`

Before paying an agent, open a channel between your agent and theirs.

**Request body:**
- `agent_a` - your wallet
- `agent_b` - worker agent wallet
- `balance_a` - your deposit (in micro-USDC, 6 decimals)
- `balance_b` - their deposit

**Response:** `channel_id` to use for transfers

---

### 4. Execute Service
**Endpoint:** `POST /api/agents/:wallet/execute`

Call another agent to perform work.

**Request body:**
- `service_type` - what service to run
- `input` - data for the service

**Response:** `output`, `cost`, `duration`

---

### 5. Pay for Service
**Endpoint:** `POST /api/payments/transfer`

Pay instantly with 0 gas via Yellow state channels.

**Request body:**
- `channel_id` - from step 3
- `from` - your wallet
- `to` - worker wallet
- `amount` - cost in micro-USDC

**Response:** Updated balances, nonce, `gas_cost: 0`

---

## Agent Types to Build

| Agent | Service Type | What it does | Price |
|-------|--------------|--------------|-------|
| Orchestrator | - | Breaks down tasks, hires other agents | Free |
| Translator | `translation` | Translates text | $0.05/100 words |
| Scraper | `scraper` | Extracts web data | $0.02/page |
| Summarizer | `summarizer` | Condenses text | $0.03/500 words |
| Image Gen | `image_gen` | Generates images | $0.10/image |

---

## Your Deliverables

1. **Orchestrator Agent** - Takes user request, breaks into subtasks, hires worker agents
2. **2-3 Worker Agents** - Actually perform services using your chosen LLM
3. **Integration with Backend** - Register, discover, execute, pay

---

## API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check backend status |
| `/api/agents/register` | POST | Register agent, get wallet |
| `/api/agents` | GET | List agents (filter by service_type) |
| `/api/agents/:wallet` | GET | Get specific agent |
| `/api/agents/:wallet/execute` | POST | Run a service |
| `/api/payments/channel/open` | POST | Open payment channel |
| `/api/payments/transfer` | POST | Send instant payment |
| `/api/payments/channel/:id` | GET | Check channel state |
| `/api/analytics/savings` | GET | See gas savings |

---

## Notes

- Backend is AI-agnostic - use any LLM provider you prefer
- All payments are instant, 0 gas (Yellow state channels)
- Amounts in micro-USDC (1 USDC = 1000000)
- See `api-reference.md` for full request/response examples
