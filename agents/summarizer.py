from langchain_google_genai import ChatGoogleGenerativeAI
class SummarizerAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

    def execute(self, text_input):
        # Taking context from the Orchestrator's current data
        prompt = f"""Summarize the following text in 3-4 complete sentences. 
Keep key technical terms and important details.
Output plain text only - no markdown formatting like **bold** or *italic*.
IMPORTANT: Make sure every sentence is complete and ends with proper punctuation.

Text to summarize:
{text_input}"""
        response = self.llm.invoke(prompt)
        
        return {
            "output": response.content,
            "cost": 0.03 # Fixed cost for demo
        }