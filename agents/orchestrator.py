import json
import os
import requests
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

# Import specialist agents
from specialists import SummarizerAgent, TranslatorAgent, ScraperAgent, ImageGenAgent, PDFLoaderAgent

load_dotenv()


class UniversalOrchestrator:
    """
    AI Orchestrator that decomposes user queries into subtasks and 
    delegates to specialist agents, then aggregates results.
    """
    
    def __init__(self, wallet=None):
        # Gemini setup for orchestration
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
        self.wallet = wallet or os.getenv("ORCHESTRATOR_WALLET")
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:5000/api")
        
        # Initialize specialist agents
        self.specialists = {
            "summarizer": SummarizerAgent(),
            "translator": TranslatorAgent(),
            "scraper": ScraperAgent(),
            "image_gen": ImageGenAgent(),
            "pdf_loader": PDFLoaderAgent()
        }
        
        self.total_cost = 0.0
       
    def run(self, user_query: str) -> dict:
        """
        Execute a workflow based on user query.
        Returns dict with final output and total cost.
        """
        # 1. SYSTEM PROMPT: Define the manager role and available tools
        available_agents = list(self.specialists.keys())
        system_instructions = f"""
        You are an AI Orchestrator. Break the user query into subtasks for these agents:
        {available_agents}

        Agent capabilities:
        - summarizer: Summarizes text, extracts key points
        - translator: Translates text between languages
        - scraper: Extracts content from URLs
        - image_gen: Generates image descriptions

        Output ONLY a valid JSON array of steps. Format: [{{"agent": "name", "instruction": "detail"}}]
        Example: query "Summarize this article and translate to Spanish" -> 
        [{{"agent": "summarizer", "instruction": "summarize the text"}}, {{"agent": "translator", "instruction": "translate to Spanish"}}]
        
        If the task only needs one agent, output a single-item array.
        """

        # 2. DECOMPOSITION: Get the plan from LLM
        messages = [
            SystemMessage(content=system_instructions),
            HumanMessage(content=f"Decompose this task: {user_query}")
        ]
        
        try:
            plan_response = self.llm.invoke(messages)
            plan_data = plan_response.content.replace('```json', '').replace('```', '').strip()
            plan = json.loads(plan_data)
        except json.JSONDecodeError as e:
            print(f"[Orchestrator] Failed to parse plan: {e}")
            # Fallback: try summarizer if we can't parse
            plan = [{"agent": "summarizer", "instruction": "process the input"}]

        print(f"[Orchestrator] Plan created with {len(plan)} step(s)")
        
        # 3. CHAINING: Execute each step
        current_data = user_query
        results = []
        
        for i, step in enumerate(plan):
            agent_type = step['agent']
            agent_instance = self.specialists.get(agent_type)

            if not agent_instance:
                print(f"[Orchestrator] Warning: Agent '{agent_type}' not found, skipping.")
                continue

            print(f"\n[Orchestrator] Step {i+1}: Hiring {agent_type} for: {step['instruction']}")
            
            # Execute the agent
            result_from_agent = agent_instance.execute(current_data)
            
            # Track results
            current_data = result_from_agent["output"]
            self.total_cost += result_from_agent["cost"]
            
            results.append({
                "step": i + 1,
                "agent": agent_type,
                "instruction": step['instruction'],
                "output_preview": current_data[:200] + "..." if len(current_data) > 200 else current_data,
                "cost": result_from_agent["cost"]
            })
            
            print(f"[{agent_type}] Done. Cost: {result_from_agent['cost']} ETH")

        return {
            "final_output": current_data,
            "total_cost": self.total_cost,
            "steps": results
        }
    
    def register_all_agents(self):
        """Register all specialist agents with the backend."""
        print("[Orchestrator] Registering all agents with backend...")
        for name, agent in self.specialists.items():
            agent.register()
        print("[Orchestrator] Registration complete!")


if __name__ == "__main__":
    orchestrator = UniversalOrchestrator()
    
    # Demo: Run a summarization task
    test_text = """Technology has transformed modern education by making learning more accessible 
    and flexible. Online classes, digital libraries, and educational apps allow students to study 
    from anywhere and learn at their own pace. Personalized learning systems use data and AI to 
    support students based on their performance, helping teachers focus more on guidance. However, 
    technology also brings challenges such as increased screen time, unequal access to devices, 
    and overdependence on automated tools. When used responsibly, technology remains a powerful 
    aid in improving the quality and reach of education."""
    
    result = orchestrator.run(f"Summarize the following text: '{test_text}'")
    
    print(f"\n{'='*60}")
    print(f"[Orchestrator] FINAL OUTPUT:")
    print(f"{'='*60}")
    print(result["final_output"])
    print(f"\n[Orchestrator] Total Cost: {result['total_cost']} ETH")