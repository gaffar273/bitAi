import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
from summarizer import SummarizerAgent
from translator import Translator
from pdf_loader import PDFLoaderAgent

load_dotenv()

class UniversalOrchestrator:
    def __init__(self, wallet):
        # Gemini setup
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
        self.wallet = wallet
        self.specialists = {
            "summarizer": SummarizerAgent(),
            "translator": Translator(),
            "pdf_loader": PDFLoaderAgent()
        }
       
    def run(self, user_query):
        # 1. SYSTEM PROMPT: Define the manager role and available tools
        system_instructions = f"""
        You are an AI Orchestrator. Break the user query into subtasks for these agents:
        {list(self.specialists.keys())}

        Output a JSON list of steps. Format: {{"agent": "name", "instruction": "detail"}}
        Example: query "Summarize this and translate to Japanese" -> 
        [{{"agent": "summarizer", "instruction": "summarize the text"}}]
        """

        # 2. DECOMPOSITION: Passing the Query as the Context
        messages = [
            SystemMessage(content=system_instructions),
            HumanMessage(content=f"Decompose this task: {user_query}")
        ]
        
        plan_response = self.llm.invoke(messages)
        # Clean the response for JSON parsing
        plan_data = plan_response.content.replace('```json', '').replace('```', '').strip()
        plan = json.loads(plan_data)

        # 3. CHAINING: Execute each step
        current_data = user_query
        for step in plan:
            agent_type = step['agent']
            agent_instance = self.specialists.get(agent_type)

            if not agent_instance:
                print(f"[Orchestrator] Error: Agent '{agent_type}' not found or not supported.")
                continue

            print(f"\n[Orchestrator] Hiring {agent_type} for: {step['instruction']}")
            
            # --- EXECUTE WORK (Step 4.1) ---
            # Directly call the agent's execute method
            result_from_agent = agent_instance.execute(current_data)
            
            # Update current_data with the output of the current agent
            current_data = result_from_agent["output"]
            
            print(f"Result: {result_from_agent['output']}\nCost: ${result_from_agent['cost']}")

        return current_data
    

if __name__ == "__main__":
    orchestrator = UniversalOrchestrator(wallet="ORCHESTRATOR_WALLET_ADDRESS")
    final_output = orchestrator.run("extract from the pdf using pdf_loader then Summarize it")
    print(f"\n[Orchestrator] Final Output:\n{final_output}")