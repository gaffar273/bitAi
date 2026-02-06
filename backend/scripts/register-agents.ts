import { config } from 'dotenv';
config();

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// Your actual agents from the agents folder
const agents = [
    {
        services: [{
            type: 'translation',
            description: 'English to Hindi translation using Gemini 2.5 Flash',
            endpoint: '/translate'
        }],
        pricing: [{ serviceType: 'translation', priceUsdc: 0.05, currency: 'USD' }]
    },
    {
        services: [{
            type: 'summarizer',
            description: 'Text summarization keeping key technical terms using Gemini',
            endpoint: '/summarize'
        }],
        pricing: [{ serviceType: 'summarizer', priceUsdc: 0.03, currency: 'USD' }]
    },
    {
        services: [{
            type: 'scraper',
            description: 'Web scraping and URL content extraction',
            endpoint: '/scrape'
        }],
        pricing: [{ serviceType: 'scraper', priceUsdc: 0.02, currency: 'USD' }]
    },
    {
        services: [{
            type: 'pdf_loader',
            description: 'PDF text extraction and processing',
            endpoint: '/load-pdf'
        }],
        pricing: [{ serviceType: 'pdf_loader', priceUsdc: 0.01, currency: 'USD' }]
    }
];

async function getExistingAgents(): Promise<string[]> {
    try {
        const response = await fetch(`${API_BASE}/api/agents`);
        const data = await response.json();
        if (data.success && data.data) {
            // Return list of service types that already exist
            return data.data.map((agent: any) => agent.services[0]?.type).filter(Boolean);
        }
    } catch (error) {
        console.error('Could not fetch existing agents:', error);
    }
    return [];
}

async function registerAgents() {
    console.log('Checking existing agents...\n');

    const existingTypes = await getExistingAgents();
    console.log(`Found ${existingTypes.length} existing agents\n`);

    let registered = 0;
    let skipped = 0;

    for (const agent of agents) {
        const serviceType = agent.services[0].type;

        // Skip if agent of this type already exists
        if (existingTypes.includes(serviceType)) {
            console.log(`[SKIP] ${serviceType.toUpperCase()} - already registered`);
            skipped++;
            continue;
        }

        try {
            const response = await fetch(`${API_BASE}/api/agents/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agent)
            });

            const data = await response.json();

            if (data.success) {
                console.log(`[OK] ${serviceType.toUpperCase()}`);
                console.log(`     Wallet: ${data.data.wallet}`);
                console.log(`     Price: $${agent.pricing[0].priceUsdc}\n`);
                registered++;
            } else {
                console.error(`[FAIL] ${serviceType}:`, data.error);
            }
        } catch (error) {
            console.error(`[ERROR] ${serviceType}:`, error);
        }
    }

    console.log(`\nDone! Registered: ${registered}, Skipped: ${skipped}`);
}

registerAgents();
