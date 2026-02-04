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
        self.backend_url = "http://localhost:5000/api"
        
        # Identity from .env or Registration
        self.wallet = os.getenv(f"{name.upper()}_WALLET")
        self.private_key = os.getenv(f"{name.upper()}_KEY")
        self.nonce = 0 

        self.llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        temperature=0
)

        


    def generate_iou(self, worker_wallet, amount):
        """Orchestrator: Signs a digital check for a worker."""
        self.nonce += 1
        return sign_payment_iou(self.private_key, worker_wallet, amount, self.nonce)

    def register(self):
        """Tells Dev 1's backend that this agent is ready for hire."""
        payload = {
            "services": [{"type": self.service_type}],
            "pricing": [{"serviceType": self.service_type, "priceUsdc": self.price}]
        }
        requests.post(f"{self.backend_url}/agents/register", json=payload)