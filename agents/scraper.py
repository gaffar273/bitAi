"""
Web Scraper Agent - Extracts clean text content from URLs
Follows the AgentSwarm pattern for marketplace integration
"""

import requests
from bs4 import BeautifulSoup
from typing import Dict, Any


class ScraperAgent:
    """
    Web scraper agent that extracts content from URLs.
    Integrates with the AgentSwarm backend for payments and orchestration.
    """
    
    def __init__(self):
        """Initialize the scraper agent with pricing."""
        self.price = 0.02  # $0.02 per scrape - competitive marketplace price
        
        # Configuration
        self.timeout = 30  # seconds
        self.max_content_length = 50000  # characters
        
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute web scraping task.
        
        Args:
            input_data: Dictionary containing 'url' key
            
        Returns:
            Dictionary with 'output' (scraped data) and 'cost'
        """
        # Extract URL from input
        url = input_data.get('url', '')
        
        if not url:
            return {
                "output": {
                    "error": "No URL provided",
                    "url": None,
                    "content": None
                },
                "cost": 0  # No charge for invalid input
            }
        
        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            return {
                "output": {
                    "error": "Invalid URL format. Must start with http:// or https://",
                    "url": url,
                    "content": None
                },
                "cost": 0
            }
        
        try:
            # Fetch the webpage
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=self.timeout)
            response.raise_for_status()  # Raise exception for 4xx/5xx status codes
            
            # Parse HTML
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Extract title
            title = soup.title.string if soup.title else "No title found"
            
            # Remove unwanted elements
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                element.decompose()
            
            # Extract clean text
            text_content = soup.get_text(separator=' ', strip=True)
            
            # Clean up whitespace
            text_content = ' '.join(text_content.split())
            
            # Limit content length - truncate at sentence boundary
            if len(text_content) > self.max_content_length:
                # Find last sentence ending before limit
                truncated = text_content[:self.max_content_length]
                # Look for last sentence ending (. ! ?)
                last_period = max(truncated.rfind('. '), truncated.rfind('! '), truncated.rfind('? '))
                if last_period > self.max_content_length * 0.7:  # Found sentence end in last 30%
                    text_content = truncated[:last_period + 1]
                else:
                    text_content = truncated + "..."
            
            # Count words
            word_count = len(text_content.split())
            
            return {
                "output": {
                    "url": url,
                    "title": title.strip(),
                    "content": text_content,
                    "word_count": word_count,
                    "status": "success"
                },
                "cost": self.price
            }
            
        except requests.exceptions.Timeout:
            return {
                "output": {
                    "error": f"Request timeout after {self.timeout} seconds",
                    "url": url,
                    "content": None
                },
                "cost": 0
            }
            
        except requests.exceptions.HTTPError as e:
            return {
                "output": {
                    "error": f"HTTP error: {e.response.status_code}",
                    "url": url,
                    "content": None
                },
                "cost": 0
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "output": {
                    "error": f"Network error: {str(e)}",
                    "url": url,
                    "content": None
                },
                "cost": 0
            }
            
        except Exception as e:
            return {
                "output": {
                    "error": f"Parsing error: {str(e)}",
                    "url": url,
                    "content": None
                },
                "cost": 0
            }


# For testing purposes
if __name__ == "__main__":
    scraper = ScraperAgent()
    
    # Test with a simple URL
    test_input = {"url": "https://example.com"}
    result = scraper.execute(test_input)
    
    print("Scraper Test Results:")
    print(f"Status: {result['output'].get('status', 'error')}")
    print(f"Title: {result['output'].get('title', 'N/A')}")
    print(f"Word Count: {result['output'].get('word_count', 0)}")
    print(f"Cost: ${result['cost']}")
    
    if result['output'].get('content'):
        print(f"Content Preview: {result['output']['content'][:200]}...")
