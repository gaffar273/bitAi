# DEV 2 Guide - AI Agent Development

## Your Role
You build the AI agents that use DEV 1's backend API for payments and registration.

---

## Architecture Overview

```
Your Code (Agent Logic)              DEV 1's Backend (Already Built)
┌─────────────────────────┐          ┌─────────────────────────────┐
│  LangChain / OpenAI     │          │  http://localhost:5000      │
│  - Orchestrator Agent   │  ─────>  │  - Agent registration       │
│  - Translator Agent     │          │  - Payment channels         │
│  - Scraper Agent        │          │  - Service execution        │
│  - Summarizer Agent     │          │  - Yellow SDK integration   │
└─────────────────────────┘          └─────────────────────────────┘
```

---

## Step 1: Register Your Agent

Each AI agent needs a wallet to receive payments.

```python
import requests

# Register a translator agent
response = requests.post("http://localhost:5000/api/agents/register", json={
    "services": [
        {
            "type": "translation",
            "description": "Translate text between languages",
            "inputSchema": {"text": "string", "target_lang": "string"},
            "outputSchema": {"translated": "string"}
        }
    ],
    "pricing": [
        {
            "serviceType": "translation",
            "priceUsdc": 0.05,
            "unit": "per 100 words"
        }
    ]
})

data = response.json()["data"]
wallet = data["wallet"]           # Agent's wallet address
private_key = data["privateKey"]  # SAVE THIS - needed for signing payments
```

---

## Step 2: Discover Other Agents

Find agents that provide a specific service:

```python
# Find all translation agents
response = requests.get("http://localhost:5000/api/agents?service_type=translation")
agents = response.json()["data"]

for agent in agents:
    print(f"Agent: {agent['wallet']}")
    print(f"Price: ${agent['pricing'][0]['priceUsdc']}")
    print(f"Reputation: {agent['reputation']}/1000")
```

---

## Step 3: Open Payment Channel

Before hiring an agent, open a payment channel:

```python
# Orchestrator opens channel with a worker agent
response = requests.post("http://localhost:5000/api/payments/channel/open", json={
    "agent_a": orchestrator_wallet,  # Your wallet
    "agent_b": worker_wallet,         # Agent you're hiring
    "balance_a": "1000000",           # 1 USDC (6 decimals)
    "balance_b": "0",
    "private_key": orchestrator_private_key  # Optional for signing
})

channel_id = response.json()["data"]["channel_id"]
```

---

## Step 4: Execute Service and Pay

Call an agent's service, then pay them:

```python
# 1. Request the service
result = requests.post(f"http://localhost:5000/api/agents/{worker_wallet}/execute", json={
    "service_type": "translation",
    "input": {
        "text": "Hello world",
        "target_lang": "es"
    }
})

output = result.json()["data"]["output"]
cost = result.json()["data"]["cost"]  # e.g., 0.05

# 2. Pay the agent (instant, 0 gas)
payment = requests.post("http://localhost:5000/api/payments/transfer", json={
    "channel_id": channel_id,
    "from": orchestrator_wallet,
    "to": worker_wallet,
    "amount": str(int(cost * 1000000))  # Convert to micro-USDC
})

print(f"Paid ${cost}, gas cost: ${payment.json()['data']['gas_cost']}")  # Always 0
```

---

## Step 5: Build the Orchestrator

The Orchestrator is the main agent that breaks down user tasks:

```python
from langchain.chat_models import ChatOpenAI
from langchain.agents import initialize_agent, Tool

llm = ChatOpenAI(model="gpt-4")

# Define tools that call the backend API
tools = [
    Tool(
        name="find_agents",
        func=lambda service_type: find_agents_api(service_type),
        description="Find agents that provide a service. Input: service type (translation, scraper, summarizer, image_gen)"
    ),
    Tool(
        name="hire_agent",
        func=lambda args: hire_and_pay_agent(args),
        description="Hire an agent to do work. Input: {wallet, service_type, input_data}"
    ),
]

orchestrator = initialize_agent(tools, llm, agent="zero-shot-react-description")

# User request
result = orchestrator.run("Create a blog post about AI in Spanish with an image")
```

---

## Agent Types to Build

| Agent | Service Type | Input | Output | Price |
|-------|--------------|-------|--------|-------|
| Translator | `translation` | text, target_lang | translated text | $0.05/100 words |
| Scraper | `scraper` | url | extracted data | $0.02/page |
| Summarizer | `summarizer` | text | summary | $0.03/500 words |
| Image Generator | `image_gen` | prompt | image URL | $0.10/image |

---

## Example: Full Flow

```python
# 1. User request
user_input = "Summarize the top tech news and translate to Japanese"

# 2. Orchestrator breaks down task
#    - Step 1: Scrape tech news (hire Scraper)
#    - Step 2: Summarize (hire Summarizer)
#    - Step 3: Translate (hire Translator)

# 3. For each step:
#    - Find cheapest/best agent
#    - Open channel (or reuse existing)
#    - Execute service
#    - Pay instantly via Yellow (0 gas)

# 4. Return final result to user
```

---

## API Reference

Full API docs: `/docs/api-reference.md`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agents/register` | POST | Register new agent |
| `/api/agents?service_type=X` | GET | Find agents |
| `/api/agents/:wallet/execute` | POST | Execute service |
| `/api/payments/channel/open` | POST | Open payment channel |
| `/api/payments/transfer` | POST | Instant payment |
| `/api/analytics/savings` | GET | See gas savings |

---

## Your Deliverables

1. **Orchestrator Agent** - Takes user input, decomposes tasks, hires agents
2. **Worker Agents** - At least 2-3 types (translator, summarizer, etc.)
3. **LangChain Integration** - Tools that call DEV 1's API
4. **Demo Script** - Show agents working together

---

## Questions?

Backend running at: `http://localhost:5000`
Test it: `curl http://localhost:5000/health`
