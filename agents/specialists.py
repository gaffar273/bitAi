from base_agent import BaseAgent


class TranslatorAgent(BaseAgent):
    def __init__(self):
        # Name, Service Type, Price in USDC (minimum floor: 0.01)
        super().__init__("Translator", "translation", 0.02)

    def execute_service(self, input_data):
        # input_data is a dict like {'text': 'Hello', 'target_lang': 'es'}
        # or could be a string from orchestrator chaining
        if isinstance(input_data, str):
            text = input_data
            target_lang = "English"
        else:
            text = input_data.get('text', str(input_data))
            target_lang = input_data.get('target_lang', 'English')
        prompt = f"Translate the following text to {target_lang}: {text}"
        return self.ask_ai(prompt)


class ScraperAgent(BaseAgent):
    def __init__(self):
        # Price in USDC (minimum floor: 0.005)
        super().__init__("Scraper", "scraper", 0.01)

    def execute_service(self, input_data):
        # input_data could be dict with 'url' or just a string URL
        if isinstance(input_data, str):
            url = input_data
        else:
            url = input_data.get('url', str(input_data))
        prompt = f"Summarize the main content found at this URL: {url}"
        return self.ask_ai(prompt)


class SummarizerAgent(BaseAgent):
    def __init__(self):
        # Price in USDC (minimum floor: 0.01)
        super().__init__("Summarizer", "summarizer", 0.02)

    def execute_service(self, input_data):
        # input_data could be dict with 'text' or just a string
        if isinstance(input_data, str):
            text = input_data
        else:
            text = input_data.get('text', str(input_data))
        prompt = f"Provide a concise summary of this text while keeping key technical terms: {text}"
        return self.ask_ai(prompt)


class ImageGenAgent(BaseAgent):
    def __init__(self):
        # Price in USDC (minimum floor: 0.03)
        super().__init__("ImageGenerator", "image_gen", 0.05)

    def execute_service(self, input_data):
        # input_data could be dict with 'prompt' or just a string
        if isinstance(input_data, str):
            prompt_text = input_data
        else:
            prompt_text = input_data.get('prompt', str(input_data))
        prompt = f"Generate a detailed image description for: {prompt_text}"
        result = self.ask_ai(prompt)
        return f"IMAGE_URL_STUB: {result[:50]}..."


class PDFLoaderAgent(BaseAgent):
    def __init__(self):
        # Price in USDC (minimum floor: 0.01)
        super().__init__("PDFLoader", "pdf_loader", 0.01)

    def execute_service(self, input_data):
        # input_data could be dict with 'pdf_path' or just a string
        if isinstance(input_data, str):
            pdf_input = input_data
        else:
            pdf_input = input_data.get('pdf_path', str(input_data))
        prompt = f"Extract and summarize the key information from a PDF document about: {pdf_input}"
        return self.ask_ai(prompt)