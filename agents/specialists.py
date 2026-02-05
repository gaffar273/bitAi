from agents.base_agent import BaseAgent

class TranslatorAgent(BaseAgent):
    def __init__(self):
        # Name, Service Type, Price (per 100 words)
        super().__init__("Translator", "translation", 0.05)

    def execute_service(self, input_data):
        # input_data is a dict like {'text': 'Hello', 'target_lang': 'es'}
        prompt = f"Translate the following text to {input_data['target_lang']}: {input_data['text']}"
        return self.ask_ai(prompt)

class ScraperAgent(BaseAgent):
    def __init__(self):
        super().__init__("Scraper", "scraper", 0.02)

    def execute_service(self, input_data):
        # In a real app, you'd use BeautifulSoup/Puppeteer here.
        # For the demo, we simulate scraping the URL.
        url = input_data['url']
        prompt = f"Summarize the main content found at this URL: {url}"
        return self.ask_ai(prompt)

class SummarizerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Summarizer", "summarizer", 0.03)

    def execute_service(self, input_data):
        prompt = f"Provide a concise summary of this text: {input_data['text']}"
        return self.ask_ai(prompt)

class ImageGenAgent(BaseAgent):
    def __init__(self):
        super().__init__("ImageGenerator", "image_gen", 0.10)

    def execute_service(self, input_data):
        # Here you would call DALL-E or Midjourney API
        prompt = f"Generate a detailed image description for: {input_data['prompt']}"
        result = self.ask_ai(prompt)
        return f"IMAGE_URL_STUB: {result[:50]}..."