# Scraper Agent - Usage Guide

## Quick Reference

**Agent Wallet**: `0x94135878A906C891adfD995dBcCD30A5102f273C`  
**Service Type**: `scraper`  
**Price**: $0.02 per scrape  
**Status**: Active in marketplace

---

## What It Does

Extracts clean text content from any URL, removing:
- Scripts and styles
- Navigation menus
- Headers and footers
- Ads and sidebars

Returns structured data with title, content, and word count.

---

## Usage Examples

### Basic Scraping
```python
from scraper import ScraperAgent

scraper = ScraperAgent()
result = scraper.execute({"url": "https://example.com"})

print(f"Title: {result['output']['title']}")
print(f"Words: {result['output']['word_count']}")
print(f"Content: {result['output']['content'][:200]}...")
```

### Via Backend API
```bash
curl -X POST http://localhost:5000/api/agents/0x94135878A906C891adfD995dBcCD30A5102f273C/execute \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "scraper",
    "input": {"url": "https://news.ycombinator.com"}
  }'
```

### In a Workflow
```bash
curl -X POST http://localhost:5000/api/orchestrator/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "orchestratorWallet": "0xYourWallet",
    "steps": [
      {
        "serviceType": "scraper",
        "input": {"url": "https://example.com"}
      },
      {
        "serviceType": "summarizer",
        "input": {"text": "{{previous.content}}"}
      }
    ]
  }'
```

---

## Error Handling

The agent handles common errors gracefully:

| Error | Response |
|-------|----------|
| Invalid URL | `{"error": "Invalid URL format", "cost": 0}` |
| Timeout | `{"error": "Request timeout after 10 seconds", "cost": 0}` |
| 404/403 | `{"error": "HTTP error: 404", "cost": 0}` |
| Network Error | `{"error": "Network error: ...", "cost": 0}` |

**Note**: Failed requests have `cost: 0` - you don't pay for errors!

---

## Configuration

Edit `scraper.py` to customize:

```python
class ScraperAgent:
    def __init__(self):
        self.price = 0.02  # Change pricing
        self.timeout = 10  # Adjust timeout
        self.max_content_length = 50000  # Content limit
```

---

## Testing

Run the built-in test:
```bash
cd agents
python scraper.py
```

Expected output:
```
Scraper Test Results:
Status: success
Title: Example Domain
Word Count: 21
Cost: $0.02
```

---

## Monitoring

Check agent status:
```bash
curl http://localhost:5000/api/agents/0x94135878A906C891adfD995dBcCD30A5102f273C
```

View all agents:
```bash
curl http://localhost:5000/api/agents
```

---

## Troubleshooting

**Agent not responding?**
- Check backend is running: `curl http://localhost:5000/health`
- Verify wallet address is correct
- Check `.env` file has correct credentials

**Scraping fails?**
- Test URL in browser first
- Check for rate limiting
- Verify URL starts with `http://` or `https://`

**Payment issues?**
- Verify Yellow Network channels are open
- Check backend logs for payment errors
- Ensure sufficient balance in orchestrator wallet

---

## Next Steps

1. **Test with real URLs**: Try news sites, blogs, documentation
2. **Monitor earnings**: Check wallet balance after jobs
3. **Optimize pricing**: Adjust based on market competition
4. **Add features**: JavaScript rendering, PDF support, etc.

---

## Support

- **Backend Logs**: Check terminal running `npm run dev`
- **Agent Logs**: Check Python console output
- **API Docs**: See `docs/dev2-guide.md`
