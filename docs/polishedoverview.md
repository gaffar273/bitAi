# AgentSwarm | ETH Global Hackathon

**One-liner:** Autonomous AI agent marketplace with Yellow state channels for micropayments.

---

## The Problem
AI agents need micropayments ($0.05/task). On-chain gas ($5/tx) kills the economics.

## The Solution
Yellow state channels: 1000 txs settle once. **99%+ gas savings.**

---

## Architecture
```
Agents (AI) <---> Yellow (Payments) <---> Base L2 (Settlement)
                         |
              Coordination Layer (Discovery, Reputation)
```

---

# Team Assignments

---

## DEV 1: Backend + Yellow SDK

### Day 1
- [ ] Yellow SDK setup: open channel, transact, settle
- [ ] API scaffold: `/agents/register`, `/payments/initiate`, `/payments/complete`
- [ ] Create Yellow wallet per agent, fund with USDC

### Day 2
- [ ] Deploy contracts: `AgentRegistry.sol`, `EscrowManager.sol`
- [ ] Payment routing between agents
- [ ] Settlement batching (every 100 txs)
- [ ] PostgreSQL: agents, txs, reputation

### Day 3
- [ ] Gas savings dashboard (real-time comparison)
- [ ] TPS and finality metrics display

**Stack:** Yellow SDK, Node.js/FastAPI, Solidity+Hardhat, PostgreSQL, Redis, Base L2

---

## DEV 2: AI Agents

### Day 1
- [ ] Agent base class: wallet, JSON-RPC comms, budget tracking
- [ ] Implement 2 agents:
  - Translation ($0.05/100 words)
  - Image Gen ($0.10/image)

### Day 2
- [ ] Implement 2 more agents:
  - Scraper ($0.02/page)
  - Summarizer ($0.03/500 words)
- [ ] Service discovery: query registry, filter by price/reputation
- [ ] Workflow orchestration: chain agents together

### Day 3
- [ ] Demo workflow: Scraper -> Summarizer -> Translator -> Image Gen
- [ ] Agent learning: track provider success rates

**Stack:** LangChain, OpenAI GPT-4, Python/TypeScript, ethers.js

---

## DEV 3: Frontend + Lead

### Day 1
- [ ] GitHub repo + task board setup
- [ ] Define API contracts with DEV 1 & DEV 2
- [ ] UI shell: Agent marketplace grid

### Day 2
- [ ] Live transaction feed (color-coded)
- [ ] Analytics dashboard: volume, gas savings
- [ ] Workflow visualizer: drag-drop agent builder

### Day 3
- [ ] Demo slides (5-7 min)
- [ ] Animated tx flows (Framer Motion)
- [ ] Record backup demo video

**Stack:** React, TypeScript, Vite, TailwindCSS, Framer Motion, Wagmi

---

## Integration Checkpoints

| End of | Target |
|--------|--------|
| Day 1 | 2 agents transact via Yellow |
| Day 2 | Full workflow: 4+ agents, payments settle |
| Day 3 | Polished demo, backup video ready |

---

## Demo Flow (5 min)

1. **Problem** (30s): Gas kills micropayments
2. **Solution** (30s): AgentSwarm + Yellow
3. **Live Demo 1** (1 min): 2-agent tx, show $0.0001 gas
4. **Live Demo 2** (2 min): 5-agent workflow, 20 txs in 30s
5. **Metrics** (1 min): 99.5% savings, 50 TPS

---

## Success Targets

- Gas savings: >95%
- Tx finality: <2s
- Autonomous txs: 1000+
- Working workflows: 3+
