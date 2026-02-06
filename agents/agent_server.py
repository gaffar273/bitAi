"""
Agent API Server - Exposes Python agents via HTTP for the Node.js backend.
Run with: python agent_server.py
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Import agents
from summarizer import SummarizerAgent
from translator import Translator
from scraper import ScraperAgent

# Try to import PDF loader (may fail if dependencies missing)
try:
    from pdf_loader import PDFLoaderAgent
    pdf_loader = PDFLoaderAgent()
except Exception as e:
    print(f"[Warning] PDF Loader not available: {e}")
    pdf_loader = None

# Initialize agents
summarizer = SummarizerAgent()
translator = Translator()
scraper = ScraperAgent()


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "agents": ["summarizer", "translator", "pdf_loader", "scraper"]})


@app.route('/execute', methods=['POST'])
def execute():
    """
    Execute an agent service.
    
    Request body:
    {
        "service_type": "summarizer" | "translation" | "pdf_loader" | "scraper",
        "input": { ... }  // Service-specific input
    }
    """
    try:
        data = request.json
        service_type = data.get('service_type')
        input_data = data.get('input', {})
        
        print(f"[AgentServer] Executing {service_type} with input: {str(input_data)[:100]}...")
        
        result = None
        
        if service_type == 'summarizer':
            # Extract text from input - handle string (chained workflow) or dict
            if isinstance(input_data, str):
                text = input_data
            else:
                text = input_data.get('text') or input_data.get('prompt') or input_data.get('output') or str(input_data)
            result = summarizer.execute(text)
            
        elif service_type == 'translation':
            text = input_data.get('text') or str(input_data)
            result = translator.execute(text)
            
        elif service_type == 'pdf_loader':
            if pdf_loader:
                result = pdf_loader.execute(input_data)
            else:
                result = {"output": "PDF Loader not available", "cost": 0.01}
                
        elif service_type == 'scraper':
            # Use real ScraperAgent
            result = scraper.execute(input_data)
            
        else:
            return jsonify({
                "success": False,
                "error": f"Unknown service type: {service_type}"
            }), 400
        
        print(f"[AgentServer] {service_type} completed. Output: {str(result.get('output', ''))[:100]}...")
        
        return jsonify({
            "success": True,
            "output": result.get('output'),
            "cost": result.get('cost', 0)
        })
        
    except Exception as e:
        print(f"[AgentServer] Error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('AGENT_SERVER_PORT', 5001))
    print(f"[AgentServer] Starting on port {port}...")
    print(f"[AgentServer] Available agents: summarizer, translator, pdf_loader, scraper")
    app.run(host='0.0.0.0', port=port, debug=True)
