# AgentSwarm Core Architecture

## The Pitch

> An economy where specialized AI agents autonomously buy and sell services from each other using thousands of micro-payments.

Users provide complex goals. An **Orchestrator Agent** breaks down the task and hires specialized sub-agents to execute. Agents pay each other instantly in USDC via Yellow state channels.

---

## Why This Matters

### The Problem
A Translator Agent charges $0.05 per 100 words. A single content generation session triggers 1,000+ translations.

**On-chain reality:**
- 1,000 transactions x $2 gas = **$2,000 in fees**
- Revenue from translations = **$50**
- Result: **Economically impossible**

### The Solution: Yellow State Channels
- Open channel once, transact 1,000 times off-chain
- Settle to blockchain once
- Gas cost: ~$2 total
- **99.9% savings**

---

## How It Works

### User Flow
```
User: "Create a blog post about AI trends in 5 languages with images"
                    |
                    v
         ┌─────────────────────┐
         │  Orchestrator Agent │  (breaks down the task)
         └─────────────────────┘
                    |
     ┌──────────────┼──────────────┬──────────────┐
     v              v              v              v
┌─────────┐  ┌───────────┐  ┌───────────┐  ┌─────────┐
│ Scraper │  │ Summarizer│  │ Translator│  │Image Gen│
│  $0.10  │  │   $0.05   │  │ $0.25 (5x)│  │  $0.15  │
└─────────┘  └───────────┘  └───────────┘  └─────────┘
                    |
                    v
         User receives final output
         Total cost: ~$0.55
         Transactions: 8+
```

### Payment Flow
```
1. Orchestrator has $10 USDC in Yellow channel
2. Scraper requests $0.10 → Orchestrator signs state update → Scraper delivers
3. Summarizer requests $0.05 → Orchestrator signs → Summarizer delivers
4. ... (all instant, off-chain)
5. Session ends → Single settlement to Base L2
```

---

## Agent Types

| Agent | Service | Pricing | Tech |
|-------|---------|---------|------|
| **Orchestrator** | Task decomposition, agent coordination | Free (user-facing) | LangChain + GPT-4 |
| **Translator** | Multi-language translation | $0.05/100 words | GPT-4 |
| **Image Generator** | Text-to-image | $0.10/image | DALL-E / Stable Diffusion |
| **Web Scraper** | Extract structured data | $0.02/page | Puppeteer + GPT-4 |
| **Summarizer** | Condense long text | $0.03/500 words | GPT-4 |
| **Code Generator** | Write/fix code | $0.15/task | GPT-4 + custom prompts |

---

## Technical Architecture

### Layer 1: Agent Runtime
```
┌─────────────────────────────────────────┐
│              Agent Instance             │
├─────────────────────────────────────────┤
│  - Wallet (private key, signing)        │
│  - Service Definition (type, pricing)   │
│  - Budget Manager (spending limits)     │
│  - Quality Tracker (provider scores)    │
│  - LangChain Tools (AI capabilities)    │
└─────────────────────────────────────────┘
```

**Every agent can:**
- Register itself on the Agent Registry (on-chain)
- Discover other agents by service type
- Request services and pay via Yellow channel
- Provide services and receive payment
- Track reputation of providers

### Layer 2: Yellow Payment Layer
```
┌─────────────────────────────────────────┐
│           Yellow State Channel          │
├─────────────────────────────────────────┤
│  Agent A ←──── Channel ────→ Agent B    │
│                    |                     │
│         Off-chain state updates         │
│         (signed by both parties)        │
│                    |                     │
│         Periodic on-chain settlement    │
└─────────────────────────────────────────┘
```

**Payment lifecycle:**
1. **Open:** Agent deposits USDC into channel contract
2. **Transact:** Both agents sign state updates (instant, free)
3. **Settle:** Either agent submits final state to chain

### Layer 3: Smart Contracts (Base L2)

**AgentRegistry.sol**
```solidity
struct Agent {
    address wallet;
    string[] serviceTypes;
    uint256[] pricing;
    uint256 reputation;
    bool active;
}

function registerAgent(string[] services, uint256[] prices) external;
function getAgentsByService(string serviceType) external view returns (Agent[]);
function updateReputation(address agent, int256 delta) external;
```

**EscrowManager.sol** (dispute resolution)
```solidity
function openDispute(bytes32 txHash, string evidence) external;
function voteOnDispute(uint256 disputeId, bool inFavor) external;
function resolveDispute(uint256 disputeId) external;
```

---

## Demo Scenario: Content Localization Pipeline

### Input
```
User: "Create a tech news summary in English, Spanish, and Japanese with a header image"
```

### Execution Trace
```
[00:00] Orchestrator receives task
[00:01] Orchestrator queries Registry → finds Scraper, Summarizer, Translator, ImageGen
[00:02] Orchestrator → Scraper: "Get top 5 tech news" | Payment: $0.10
[00:04] Scraper returns 5 articles (2000 words total)
[00:05] Orchestrator → Summarizer: "Condense to 300 words" | Payment: $0.03
[00:07] Summarizer returns summary
[00:08] Orchestrator → Translator: "Translate to Spanish" | Payment: $0.05
[00:10] Orchestrator → Translator: "Translate to Japanese" | Payment: $0.05
[00:12] Orchestrator → ImageGen: "Tech news header image" | Payment: $0.10
[00:15] Orchestrator packages final output → returns to user

Total time: 15 seconds
Transactions: 5
Total cost: $0.33
Gas saved: ~$9.97 (vs on-chain)
```

---

## Complete Payment System Flow

### Overview: User to Agents

```
┌─────────┐     $1.00      ┌──────────────┐    Yellow     ┌─────────────┐
│  USER   │ ────────────>  │ Orchestrator │ ────────────> │   Agents    │
└─────────┘   (one-time)   └──────────────┘  (0-gas txs)  └─────────────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │ Revenue Share   │
                        │ Distribution    │
                        └─────────────────┘
```

### Step-by-Step Payment Flow

#### Step 1: User Funds Orchestrator
```
User deposits $1.00 USDC to Orchestrator wallet
  └── On-chain transaction (one-time gas cost ~$0.50)
  └── Orchestrator now has budget for workflow
```

#### Step 2: Orchestrator Opens Yellow Channel
```
Orchestrator opens state channel with $1.00 balance
  └── POST /api/payments/channel/open
  └── Channel ID generated (e.g., "0xChannel123")
  └── Gas: $0 (off-chain from here)
```

#### Step 3: Workflow Execution with Instant Payments
```
For each step in workflow:
  1. Orchestrator selects cheapest agent for service
  2. Agent executes task
  3. Orchestrator signs payment state update
  4. Agent receives payment instantly (0 gas)

Example:
  ┌───────────┐ $0.02  ┌─────────┐
  │Orchestrator├──────> │ Scraper │  (step 1)
  └─────┬─────┘        └─────────┘
        │
        │ $0.03  ┌───────────┐
        ├──────> │ Summarizer│  (step 2)
        │        └───────────┘
        │
        │ $0.05  ┌────────────┐
        └──────> │ Translator │  (step 3)
                 └────────────┘
```

#### Step 4: Revenue Share Distribution (Dynamic Weights)
```
Total Workflow Cost: $0.10

Weight Calculation per Agent:
  weight = 0.30 * complexity + 0.25 * time + 0.25 * quality + 0.20 * output_size

Example Distribution:
  ┌─────────────┬────────────┬────────┬─────────┐
  │ Agent       │ Complexity │ Weight │ Payment │
  ├─────────────┼────────────┼────────┼─────────┤
  │ Scraper     │ 0.3        │ 18%    │ $0.018  │
  │ Summarizer  │ 0.5        │ 35%    │ $0.035  │
  │ Translator  │ 0.6        │ 47%    │ $0.047  │
  └─────────────┴────────────┴────────┴─────────┘
```

#### Step 5: Settlement (Optional - Batch)
```
After many workflows:
  └── Orchestrator calls POST /api/payments/settle
  └── All state updates batched into ONE on-chain tx
  └── Final balances written to Base L2
  └── Gas: ~$0.50 total (for 100+ txs)
```

### Payment System Components

| Component | Purpose | File |
|-----------|---------|------|
| **PaymentService** | Transfer funds via Yellow | `PaymentService.ts` |
| **RevenueShareService** | Calculate dynamic weights & distribute | `PaymentService.ts` |
| **YellowService** | Yellow SDK integration | `YellowService.ts` |
| **TransactionLogger** | Log all payments to DB | `TransactionLogger.ts` |

### Price Floors (Minimum Payments)

To prevent race-to-bottom pricing:

| Service | Minimum Price |
|---------|---------------|
| translation | $0.01 |
| summarizer | $0.01 |
| scraper | $0.005 |
| image_gen | $0.03 |

### Dispute Handling

```
┌─────────────────────────────────────────────────────┐
│                  DISPUTE FLOW                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. AUTOMATIC RESOLUTION                            │
│     ├── Timeout (30s) → Auto-refund to client       │
│     ├── Quality check failed → No payment           │
│     └── 1 retry before escalation                   │
│                                                      │
│  2. MANUAL REVIEW (if auto fails)                   │
│     ├── Admin reviews flagged transaction           │
│     ├── Both parties submit evidence                │
│     └── Resolution: refund / partial / paid         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### API Endpoints for Payments

| Endpoint | Purpose |
|----------|---------|
| `POST /api/payments/channel/open` | Open Yellow channel |
| `POST /api/payments/transfer` | Send instant payment |
| `GET /api/payments/channel/:id` | Get channel balance |
| `POST /api/payments/settle` | Settle to blockchain |
| `POST /api/orchestrator/workflow` | Execute workflow with auto-payments |

### Gas Savings Example

| Scenario | On-Chain | Yellow | Savings |
|----------|----------|--------|---------|
| 1 payment | $2.00 | $0.00 | 100% |
| 10 payments | $20.00 | $0.00 | 100% |
| 100 payments | $200.00 | $0.50 (settle) | 99.75% |
| 1000 payments | $2000.00 | $0.50 (settle) | 99.98% |

---

## Tech Stack Summary

| Component | Technology | Owner |
|-----------|------------|-------|
| Agent Framework | LangChain + Python/TS | DEV 2 |
| AI Models | OpenAI GPT-4, DALL-E | DEV 2 |
| Payment Layer | Yellow SDK | DEV 1 |
| Smart Contracts | Solidity + Hardhat | DEV 1 |
| Backend API | Node.js / FastAPI | DEV 1 |
| Database | PostgreSQL + Redis | DEV 1 |
| Frontend | React + Vite | DEV 3 |
| Blockchain | Base L2 | DEV 1 |

---

## Key Differentiators

1. **Autonomous Economy**: Agents transact without human intervention
2. **Yellow Integration Depth**: Not "we used Yellow" but "Yellow makes this possible"
3. **Live Demo**: Judges watch real money flow between agents in real-time
4. **Scalable**: Add new agent types without infrastructure changes
5. **Real Use Case**: AI agent micropayments is a genuine 2025+ problem

---

## The Winning Moment

> Judge watches Orchestrator hire 4 agents in 15 seconds.  
> 5 payments happen instantly.  
> Total gas: $0.002.  
> Judge realizes: "This is impossible without Yellow."

That's when we win.
