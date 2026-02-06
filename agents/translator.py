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
        Auto-detect language and translate:
        - Hindi input -> English output
        - English input -> Hindi output
        """
        # Let Gemini detect language and translate accordingly
        prompt = (
            f"Detect the language of the following text. "
            f"If it's in Hindi or any Indian language, translate it to English. "
            f"If it's in English, translate it to Hindi. "
            f"Return only the translated text, nothing else.\n\n"
            f"Text: {text}"
        )
        
        response = self.llm.invoke(prompt)
        
        # Returns structured data for the Orchestrator to handle chaining and payments
        return {
            "output": response.content,
            "cost": self.price
        }