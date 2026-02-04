import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { config } from '../config';

// Neon serverless SQL client
let sql: NeonQueryFunction<false, false> | null = null;

export function getSQL() {
    if (!sql && config.databaseUrl) {
        sql = neon(config.databaseUrl);
        console.log('[Database] Connected to Neon serverless database');
    }
    return sql;
}

// Initialize database schema
export async function initDatabase() {
    const sql = getSQL();

    if (!sql) {
        console.log('[Database] No DATABASE_URL configured, skipping schema init');
        return;
    }

    try {
        // Agents table
        await sql`
            CREATE TABLE IF NOT EXISTS agents (
                id VARCHAR(255) PRIMARY KEY,
                wallet VARCHAR(255) NOT NULL UNIQUE,
                services JSONB NOT NULL,
                pricing JSONB NOT NULL,
                reputation INTEGER DEFAULT 500,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Transactions table
        await sql`
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(255) PRIMARY KEY,
                from_wallet VARCHAR(255) NOT NULL,
                to_wallet VARCHAR(255) NOT NULL,
                amount NUMERIC NOT NULL,
                service_type VARCHAR(100),
                channel_id VARCHAR(255),
                gas_cost NUMERIC DEFAULT 0,
                status VARCHAR(50) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Workflows table
        await sql`
            CREATE TABLE IF NOT EXISTS workflows (
                id VARCHAR(255) PRIMARY KEY,
                orchestrator_wallet VARCHAR(255) NOT NULL,
                total_steps INTEGER NOT NULL,
                total_cost NUMERIC NOT NULL,
                total_duration INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'completed',
                error TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Workflow steps table
        await sql`
            CREATE TABLE IF NOT EXISTS workflow_steps (
                id SERIAL PRIMARY KEY,
                workflow_id VARCHAR(255) REFERENCES workflows(id),
                step_number INTEGER NOT NULL,
                service_type VARCHAR(100) NOT NULL,
                agent_wallet VARCHAR(255) NOT NULL,
                cost NUMERIC NOT NULL,
                duration INTEGER NOT NULL,
                payment_tx_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Payment channels table
        await sql`
            CREATE TABLE IF NOT EXISTS payment_channels (
                channel_id VARCHAR(255) PRIMARY KEY,
                session_id VARCHAR(255),
                agent_a VARCHAR(255) NOT NULL,
                agent_b VARCHAR(255) NOT NULL,
                balance_a NUMERIC NOT NULL,
                balance_b NUMERIC NOT NULL,
                nonce INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT NOW(),
                settled_at TIMESTAMP
            )
        `;

        console.log('[Database] Schema initialized successfully');
    } catch (error) {
        console.error('[Database] Error initializing schema:', error);
        throw error;
    }
}

// Close database connection (not needed for Neon serverless)
export async function closeDatabase() {
    console.log('[Database] Neon serverless - no connection to close');
}
