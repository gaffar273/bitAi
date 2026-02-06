"""
Base Agent class for all AI agents in the AgentSwarm ecosystem.
Provides wallet integration, payment handling, and backend communication.
"""

import os
import requests
from dotenv import load_dotenv
from typing import Optional, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI

from core.wallet import sign_payment_iou, create_payment_request

load_dotenv()


class BaseAgent:
    """
    Base class for AI agents that can be hired for tasks.
    Handles wallet identity, pricing, and payment integration.
    """
    
    def __init__(self, name: str, service_type: str, price: float):
        """
        Initialize the agent.
        
        Args:
            name: Agent name (used for env var lookup)
            service_type: Type of service provided (translation, summarizer, etc.)
            price: Price per unit in ETH (e.g., 0.00005 for $0.05 equivalent)
        """
        self.name = name
        self.service_type = service_type
        self.price = price
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:5000/api")
        
        # Identity from .env or Registration
        self.wallet = os.getenv(f"{name.upper()}_WALLET")
        self.private_key = os.getenv(f"{name.upper()}_KEY")
        self.nonce = 0
        
        # Budget tracking
        self.total_earned = 0.0
        self.jobs_completed = 0
        
        # LLM for AI tasks
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0
        )
    
    def generate_iou(self, worker_wallet: str, amount: int) -> Dict[str, Any]:
        """
        Generate a signed IOU for payment (used by orchestrators).
        
        Args:
            worker_wallet: Wallet address of the agent to pay
            amount: Payment amount in wei
            
        Returns:
            Signed IOU dictionary
        """
        if not self.private_key:
            raise ValueError("Private key required for signing IOUs")
        
        self.nonce += 1
        return sign_payment_iou(self.private_key, worker_wallet, amount, self.nonce)
    
    def register(self) -> Optional[Dict[str, Any]]:
        """
        Register this agent with the backend.
        Returns the registration response with wallet and private key.
        """
        payload = {
            "services": [{
                "type": self.service_type,
                "description": f"{self.name} - {self.service_type} agent"
            }],
            "pricing": [{
                "serviceType": self.service_type,
                "priceUsdc": self.price,
                "unit": "per request"
            }]
        }
        
        try:
            response = requests.post(
                f"{self.backend_url}/agents/register",
                json=payload,
                timeout=10
            )
            
            if response.ok:
                data = response.json()
                if data.get("success"):
                    agent_data = data.get("data", {})
                    self.wallet = agent_data.get("wallet")
                    self.private_key = agent_data.get("privateKey")
                    print(f"[{self.name}] Registered successfully: {self.wallet}")
                    return agent_data
            
            print(f"[{self.name}] Registration failed: {response.text}")
            return None
            
        except Exception as e:
            print(f"[{self.name}] Registration error: {e}")
            return None
    
    def confirm_payment(self, channel_id: str, amount: float, from_wallet: str) -> bool:
        """
        Confirm receipt of payment via the backend.
        
        Args:
            channel_id: Payment channel ID
            amount: Payment amount received
            from_wallet: Wallet that sent the payment
            
        Returns:
            True if payment confirmed
        """
        self.total_earned += amount
        self.jobs_completed += 1
        print(f"[{self.name}] Payment received: {amount} ETH from {from_wallet[:10]}...")
        return True
    
    def execute(self, input_data: Any) -> Dict[str, Any]:
        """
        Execute the agent's task. Override in subclasses.
        
        Args:
            input_data: Input for the task
            
        Returns:
            Dictionary with output and cost
        """
        raise NotImplementedError("Subclasses must implement execute()")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics."""
        return {
            "name": self.name,
            "wallet": self.wallet,
            "service_type": self.service_type,
            "price": self.price,
            "total_earned": self.total_earned,
            "jobs_completed": self.jobs_completed
        }
    
    def request_payment(
        self,
        from_wallet: str,
        amount: int,
        channel_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Request payment for completed work.
        
        Args:
            from_wallet: Wallet to charge
            amount: Amount in wei
            channel_id: Optional channel ID
            
        Returns:
            Payment request dictionary
        """
        return create_payment_request(
            from_wallet=from_wallet,
            to_wallet=self.wallet,
            amount=amount,
            service_type=self.service_type,
            channel_id=channel_id
        )
