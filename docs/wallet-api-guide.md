# Wallet Connect API Testing Guide

## Base Sepolia Testnet Configuration

Make sure your `.env` has:
```env
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_SEPOLIA_CHAIN_ID=84532
USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
PRIVATE_KEY=your_private_key_here
```

## API Endpoints

### 1. Check Balance

Test getting ETH and USDC balances on Base Sepolia:

```bash
curl http://localhost:5000/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/balance
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "eth": "0.05",
    "usdc": "100.00",
    "usdcRaw": "100000000"
  }
}
```

---

### 2. Connect Wallet (Verify Signature)

To verify wallet ownership, the user signs a message with their wallet:

```bash
# Example with a test signature (replace with real signature in production)
curl -X POST http://localhost:5000/api/wallet/connect \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0xsignature_here",
    "message": "Sign to verify wallet ownership"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc...",
    "verified": true,
    "balances": {
      "eth": "0.05",
      "usdc": "100.00"
    }
  }
}
```

**Frontend Implementation (React + ethers):**
```typescript
import { ethers } from 'ethers';

async function connectWallet() {
  // Request wallet connection
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  // Sign verification message
  const message = "Sign to verify wallet ownership";
  const signature = await signer.signMessage(message);
  
  // Verify on backend
  const response = await fetch('http://localhost:5000/api/wallet/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, message })
  });
  
  const result = await response.json();
  console.log('Connected:', result.data);
}
```

---

### 3. Fund Yellow Channel

Create a Yellow Network payment channel:

```bash
curl -X POST http://localhost:5000/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/fund-channel \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "10.00",
    "partnerAddress": "0xOrchestratorAddress"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-abc123",
    "channelId": "channel-xyz789",
    "userBalance": "10000000",
    "status": "open"
  }
}
```

---

### 4. Get Active Channels

View all Yellow Network channels for a wallet:

```bash
curl http://localhost:5000/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/channels
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc...",
    "channels": [
      {
        "sessionId": "session-abc123",
        "channelId": "channel-xyz789",
        "userAddress": "0x742d35Cc...",
        "partnerAddress": "0xOrchestrator...",
        "status": "open"
      }
    ],
    "count": 1
  }
}
```

---

### 5. Record Deposit

Track a USDC deposit transaction:

```bash
curl -X POST http://localhost:5000/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "50.00",
    "txHash": "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
    "token": "USDC"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "depositId": "dep-1738772541-abc123",
    "amount": "50.00",
    "txHash": "0xdeadbeef...",
    "confirmed": true,
    "timestamp": "2026-02-05T14:35:41.000Z"
  }
}
```

---

### 6. Get Deposit History

```bash
curl http://localhost:5000/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/deposits
```

---

## Integration Flow

### Complete User Journey

1. **User connects wallet** via MetaMask
2. **Backend verifies** signature (`/api/wallet/connect`)
3. **Frontend displays** balances (`/api/wallet/:address/balance`)
4. **User funds channel** with USDC (`/api/wallet/:address/fund-channel`)
5. **User can now orchestrate** AI agent workflows with their wallet
6. **Payments flow** through Yellow Network (0 gas)
7. **Settle to Base Sepolia** when session ends

### Example: Execute Workflow with Funded Wallet

After funding a channel, use the wallet as orchestrator:

```bash
curl -X POST http://localhost:5000/api/orchestrator/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "orchestratorWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "steps": [
      {
        "serviceType": "translation",
        "input": {"text": "Hello", "targetLanguage": "es"}
      }
    ]
  }'
```

The system will:
- Find cheapest translation agent
- Pay from the user's Yellow channel
- Return translated result
- Update channel balance

---

## Testing Checklist

- [ ] `/api/wallet/:address/balance` returns correct ETH and USDC values
- [ ] `/api/wallet/connect` verifies signatures correctly
- [ ] `/api/wallet/:address/fund-channel` creates Yellow sessions
- [ ] `/api/wallet/:address/channels` shows active channels
- [ ] Funded wallet can execute workflows
- [ ] Backend server restarts without losing channel state (will be fixed with DB persistence)

---

## Notes for Dev 3 (Frontend)

### Required Libraries

```bash
npm install ethers wagmi viem @web3modal/wagmi
```

### Wallet Connection Component

```typescript
import { useAccount, useSignMessage } from 'wagmi';

function WalletConnect() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const handleConnect = async () => {
    const message = "Sign to verify wallet ownership";
    const signature = await signMessageAsync({ message });
    
    const res = await fetch('/api/wallet/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, message })
    });
    
    const data = await res.json();
    console.log('Balances:', data.data.balances);
  };
  
  return <button onClick={handleConnect}>Connect Wallet</button>;
}
```

### Channel Funding UI

```typescript
async function fundChannel(amount: string) {
  const res = await fetch(`/api/wallet/${address}/fund-channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      amount,
      partnerAddress: '0xOrchestratorAddress' // From config
    })
  });
  
  const result = await res.json();
  console.log('Channel created:', result.data.channelId);
}
```

---

## Production Considerations

1. **USDC Approval**: Users need to approve USDC spending before deposits
2. **Gas Estimation**: Show gas cost estimates for transactions
3. **Transaction Confirmation**: Wait for block confirmations before marking deposits as confirmed
4. **Error Handling**: Handle wallet connection errors, rejected signatures, insufficient balance
5. **Session Persistence**: Store channel data in database for recovery after server restarts
