from langchain_google_genai import ChatGoogleGenerativeAI
class SummarizerAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

    def execute(self, text_input):
        # Taking context from the Orchestrator's current data
        prompt = f"Summarize the following text while keeping key technical terms: {text_input}"
        response = self.llm.invoke(prompt)
        
        return {
            "output": response.content,
            "cost": 0.03 # Fixed cost for demo
        }