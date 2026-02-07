# Rogue Capital - Hackathon Demo Script (3-4 Minutes)

**Target Audience:** Hackathon Judges & Developers
**Core Value Prop:** Autonomous AI agent marketplace with *instant*, *gas-free* micropayments via Yellow Network.

---

## 0:00 - 0:45 | The Problem & "Why Yellow?"

**[Visual: Split screen. Left side: Validating an L2 transaction (slow, costs gas). Right side: Matrix-style stream of rapid data/transactions.]**

**Speaker:**
"We're entering the age of the Machine Economy. AI agents will perform millions of micro-tasks daily—scraping, inferencing, negotiating. But there's a fatal bottleneck: **Blockchain Scalability.**"

"Even on L2s, paying $0.001 gas for a $0.05 task destroys the unit economics. Waiting 2 seconds for block inclusion kills agent velocity. This is why we need **Yellow Network**."

**[Visual: Rogue Capital Landing Page]**

"Meet **Rogue Capital**. The first agent marketplace built on **Yellow State Channels**. We enable agents to trade instantly, with **zero gas fees** and **zero latency**."

---

## 0:45 - 2:00 | Live Demo: The Workflow Builder

**[Visual: Connect Wallet -> "Open Channel" transaction]**

**Speaker:**
"Let's see it in action. First, I open a **Yellow Payment Channel**.
*Technical Note:* This is the ONLY on-chain transaction we'll make for the entire session. I'm locking my funds into a smart contract, creating a private, high-speed lane between me and the agent swarm."

**[Visual: Workflow Builder. Searching for agents.]**

"Now I'm in the Workflow Builder. I'll chain three agents:
1.  **Scraper** ($0.01)
2.  **Summarizer** ($0.02)
3.  **Translator** ($0.02)

Total cost: $0.05. On mainnet, gas would be $5.00. On L2, maybe $0.10. On Yellow? **$0.00**."

**[Visual: Execute Workflow. Logs flying by. 'Agent Pool' balance ticking up rapidly.]**

**Speaker:**
"I hit execute. Watch the 'Agent Pool'. That balance is updating in *milliseconds*.
What's happening under the hood?
1.  My wallet signs a state update: 'Balance: 0.99, Agent: 0.01'.
2.  The agent signs it.
3.  The transaction is final.
No mempool. No block times. Just cryptographic certainty."

---

## 2:00 - 3:00 | Deep Dive: What Yellow Is Doing & How We Implemented It

**[Visual: Architecture Diagram showing User Wallet <-> Yellow Network <-> Agent Wallet]**

**Speaker:**
"So what exactly is Yellow doing here? It's solving the **Counterparty Discovery and State Channel problem**."

**1. Channel Creation (`YellowService.createSession`)**
"When I clicked 'Open Channel', our backend invoked the Yellow SDK to create a session. This locks funds on-chain, effectively bridging assets into a high-performance Layer 3 network."

**2. Off-Chain Signing (`WalletConnect.tsx`)**
"Every time an agent step completes, our `OrchestratorService` triggers a payment.
Critically, this happens **off-chain**. The user's wallet automatically signs a cryptographic message proving the new balance state.
We use `ethers.utils.verifyMessage` to validate these signatures instantly without touching the blockchain."

**3. Settlement (`settleOnChain`)**
"Finally, settlement. Yellow aggregates thousands of these micro-signatures into a single proof. When we call `settleOnChain`, we submit this proof to Base Sepolia. The smart contract verifies the final balance and releases the funds.
**One transaction. Infinite scale.**"

---

## 3:00 - 3:30 | Technical Conclusion & Impact

**[Visual: Dashboard showing "Gas Saved: $15.42" and "TPS: Infinite"]**

**Speaker:**
"By leveraging Yellow Network, we've solved the micropayment problem:
-   **Scalability:** Independent of L1/L2 congestion.
-   **Cost:** Zero marginal cost per transaction.
-   **Architecture:** Hybrid Web3 (React + Yellow SDK + Python Agents).

This is how agents will work. This is Rogue Capital. Thank you."

---

## Production Notes for Tomorrow

*   **Emphasis on "Zero Gas":** When the workflow runs, explicitly point out that *no wallet popups* are appearing for the individual steps. This is the "magic moment".
*   **Show the Code:** During the Deep Dive, flash the `YellowService.ts` code on screen to show the `verifyMessage` logic. It proves you built it.
*   **Settlement:** Show the Etherscan link if possible to prove it settled on Base Sepolia.
