"""
Simplified Agent Server - Only runs the scraper agent
Run with: python scraper_server.py
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Import only the scraper
from scraper import ScraperAgent

# Initialize scraper
scraper = ScraperAgent()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok", 
        "agents": ["scraper"],
        "version": "1.0.0"
    })

@app.route('/execute', methods=['POST'])
def execute():
    """
    Execute the scraper agent.
    
    Request body:
    {
        "service_type": "scraper",
        "input": { "url": "https://example.com" }
    }
    """
    try:
        data = request.json
        service_type = data.get('service_type')
        input_data = data.get('input', {})
        
        print(f"[ScraperServer] Executing {service_type} with input: {str(input_data)[:100]}...")
        
        if service_type == 'scraper':
            result = scraper.execute(input_data)
            
            print(f"[ScraperServer] Scraper completed. Output: {str(result.get('output', ''))[:100]}...")
            
            return jsonify({
                "success": True,
                "output": result.get('output'),
                "cost": result.get('cost', 0)
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Only 'scraper' service is available, got: {service_type}"
            }), 400
        
    except Exception as e:
        print(f"[ScraperServer] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('AGENT_SERVER_PORT', 5001))
    print("=" * 60)
    print("🤖 Scraper Agent Server Starting...")
    print("=" * 60)
    print(f"Server running on: http://localhost:{port}")
    print(f"Health check: http://localhost:{port}/health")
    print("Available services: scraper")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
