import os
import requests
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI

from core.wallet import sign_payment_iou

load_dotenv()

class BaseAgent:
    def __init__(self, name, service_type, price):
        self.name = name
        self.service_type = service_type
        self.price = price
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:5000/api")
        
        # Identity from .env or Registration
        self.wallet = os.getenv(f"{name.upper()}_WALLET")
        self.private_key = os.getenv(f"{name.upper()}_KEY")
        self.nonce = 0 

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-pro",
            temperature=0
        )

    def ask_ai(self, prompt: str) -> str:
        """Helper method to call the LLM and get a response."""
        response = self.llm.invoke(prompt)
        return response.content

    def execute(self, input_data: dict) -> dict:
        """
        Execute the agent's service. Override execute_service in subclasses.
        Returns dict with output and cost.
        """
        result = self.execute_service(input_data)
        return {
            "output": result,
            "cost": self.price
        }

    def execute_service(self, input_data):
        """Override this in subclasses to implement specific service logic."""
        raise NotImplementedError("Subclasses must implement execute_service")

    def generate_iou(self, worker_wallet, amount):
        """Orchestrator: Signs a digital check for a worker."""
        self.nonce += 1
        return sign_payment_iou(self.private_key, worker_wallet, amount, self.nonce)

    def register(self):
        """Register this agent with the backend. Returns wallet and private key."""
        payload = {
            "services": [{"type": self.service_type}],
            "pricing": [{"serviceType": self.service_type, "priceUsdc": self.price}]
        }
        try:
            response = requests.post(f"{self.backend_url}/agents/register", json=payload)
            if response.status_code == 201:
                data = response.json()
                if data.get("success"):
                    agent_data = data["data"]
                    self.wallet = agent_data["wallet"]
                    self.private_key = agent_data["privateKey"]
                    print(f"[{self.name}] Registered! Wallet: {self.wallet[:10]}...")
                    return agent_data
            print(f"[{self.name}] Registration failed: {response.text}")
            return None
        except Exception as e:
            print(f"[{self.name}] Registration error: {e}")
            return None