import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

class Translator:
    def __init__(self):
        # Using Gemini 1.5 Flash for fast, low-cost translation
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
        self.price = 0.05  # Standard marketplace price

    def execute(self, text):
        """
        Naming convention matches Orchestrator's .execute() call.
        By default, this logic translates English to Hindi as requested.
        """
        # System prompt instructs Gemini on the specific task
        prompt = (
            f"You are a professional translator. Translate the following English text "
            f"into Hindi. Return only the translated text.\n\n"
            f"Text: {text}"
        )
        
        response = self.llm.invoke(prompt)
        
        # Returns structured data for the Orchestrator to handle chaining and payments
        return {
            "output": response.content,
            "cost": self.price
        }