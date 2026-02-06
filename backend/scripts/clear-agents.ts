import { config } from 'dotenv';
config();

import { neon } from '@neondatabase/serverless';

async function clearAgents() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL not configured');
        process.exit(1);
    }

    const sql = neon(databaseUrl);

    console.log('Clearing all agents from database...\n');

    try {
        const result = await sql`DELETE FROM agents RETURNING wallet`;
        console.log(`Deleted ${result.length} agents.`);
        console.log('\nDone! Run "npm run register-agents" to register fresh agents.');
    } catch (error) {
        console.error('Failed to clear agents:', error);
    }
}

clearAgents();
