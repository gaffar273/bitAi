# DEV 2 Guide - AI Agent Integration

## What You Need from DEV 1's Backend

**Backend URL**: `http://localhost:5000`  
**Status**: Day 2 Complete - Ready for integration

---

## What's Already Built (Backend)

✓ Agent registration & wallet generation  
✓ Multi-agent workflow orchestration  
✓ Automatic agent selection (cheapest + best reputation)  
✓ Payment routing (Yellow micropayments, 0 gas)  
✓ Database logging (Neon PostgreSQL)  
✓ Reputation system (+10 per successful job)  
✓ Transaction history & analytics  

**You just build the AI logic. Backend handles everything else.**

---

## Quick Reference: What You Need

### 1. Register Your Agent

**Endpoint**: `POST /api/agents/register`

**Request**:
```json
{
  "services": [
    {"type": "translation", "description": "Your description"}
  ],
  "pricing": [
    {"serviceType": "translation", "priceUsdc": 0.05}
  ]
}
```

**Response**: You get `wallet`, `privateKey`, `id`

**Service Types**: `translation`, `summarizer`, `scraper`, `image_gen`

---

### 2. Discover Other Agents

**Endpoint**: `GET /api/agents?service_type=translation`

Returns list of agents with wallet, pricing, reputation.

---

### 3. Execute Multi-Agent Workflow

**Endpoint**: `POST /api/orchestrator/workflow`

**Request**:
```json
{
  "orchestratorWallet": "0xYourWallet",
  "steps": [
    {"serviceType": "scraper", "input": {"url": "..."}},
    {"serviceType": "summarizer"},
    {"serviceType": "translation"}
  ]
}
```

**What happens automatically**:
- Backend selects cheapest agents
- Chains outputs → inputs
- Routes all payments
- Logs to database
- Updates reputation

**Response**: All step results, total cost, duration

---

### 4. Execute Single Service (Testing)

**Endpoint**: `POST /api/agents/:wallet/execute`

**Request**:
```json
{
  "service_type": "translation",
  "input": {"text": "Hello world"}
}
```

**Response**: `output`, `cost`, `duration`

---

## Agent Types Needed (For Demo)

| Priority | Service Type | What It Does | Typical Price |
|----------|--------------|--------------|---------------|
| **High** | `translation` | Translate text | $0.05 |
| **High** | `summarizer` | Summarize content | $0.03 |
| Medium | `scraper` | Web scraping | $0.02 |
| Medium | `image_gen` | Generate images | $0.10 |

Use any LLM you want: OpenAI, Gemini, Claude, Vertex AI, etc.

---

## API Endpoints You'll Use

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check backend status |
| `/api/agents/register` | POST | Register your agent |
| `/api/agents` | GET | List agents (filter by service_type) |
| `/api/agents/:wallet/execute` | POST | Execute a service |
| `/api/orchestrator/workflow` | POST | Run multi-agent workflow |
| `/api/orchestrator/pricing/:serviceType` | GET | Compare agent pricing |
| `/api/analytics/savings` | GET | Gas savings metrics |
| `/api/analytics/transactions` | GET | Transaction history |

---

## Database (Automatic)

Your agents are automatically logged to Neon database:
- All transactions
- Workflow executions
- Reputation updates
- Performance metrics

You don't need to interact with the database - it's automatic.

---

## Pricing & Payments

**Currency**: Micro-USDC (6 decimals)
- `1000000` = $1.00
- `50000` = $0.05
- `20000` = $0.02

**Payment**: Automatic via Yellow state channels (0 gas)

---

## Reputation System

- Agents start at **500 reputation**
- **+10** per successful job
- Range: **0-1000**
- Higher reputation = preferred in tie-breaks

---

## Your Deliverables

**Minimum (For Demo)**:
1. Translation agent
2. Summarizer agent
3. Register both with backend

**Optional**:
- Scraper agent
- Image generation agent
- Custom orchestrator logic

---

## Testing

### Test Backend is Running:
```bash
curl http://localhost:5000/health
```

### Register Agent:
```bash
POST http://localhost:5000/api/agents/register
```

### Test Workflow:
```bash
POST http://localhost:5000/api/orchestrator/workflow
```

---

## Full Documentation

For complete API details, see:
- `api-reference.md` - All endpoints with examples
- `day2-testing-guide.md` - Testing workflows

---

## Need Help?

1. Check `api-reference.md` for endpoint details
2. Backend logs: Check terminal running `npm run dev`
3. Test with: `curl http://localhost:5000/health`

**Backend is ready. Build your AI agents however you want!**
