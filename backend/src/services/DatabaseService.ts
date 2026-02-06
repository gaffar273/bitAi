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

        // Workflow payments (revenue share distribution)
        await sql`
            CREATE TABLE IF NOT EXISTS workflow_payments (
                id VARCHAR(255) PRIMARY KEY,
                workflow_id VARCHAR(255) REFERENCES workflows(id),
                total_amount NUMERIC NOT NULL,
                distributed_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Participant shares in workflows
        await sql`
            CREATE TABLE IF NOT EXISTS participant_shares (
                id SERIAL PRIMARY KEY,
                payment_id VARCHAR(255) REFERENCES workflow_payments(id),
                agent_wallet VARCHAR(255) NOT NULL,
                service_type VARCHAR(100) NOT NULL,
                weight NUMERIC(5,4) NOT NULL,
                payment NUMERIC NOT NULL,
                complexity_score NUMERIC(3,2),
                processing_time_ms INTEGER,
                output_size_bytes INTEGER,
                quality_score NUMERIC(3,2) DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // Disputes
        await sql`
            CREATE TABLE IF NOT EXISTS disputes (
                id VARCHAR(255) PRIMARY KEY,
                workflow_id VARCHAR(255) REFERENCES workflows(id),
                initiator VARCHAR(255) NOT NULL,
                reason VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                resolution VARCHAR(50),
                evidence TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                resolved_at TIMESTAMP
            )
        `;

        // Price floors
        await sql`
            CREATE TABLE IF NOT EXISTS price_floors (
                service_type VARCHAR(100) PRIMARY KEY,
                min_price_usdc NUMERIC NOT NULL
            )
        `;

        // Insert default price floors
        await sql`
            INSERT INTO price_floors (service_type, min_price_usdc)
            VALUES 
                ('translation', 0.01),
                ('summarizer', 0.01),
                ('scraper', 0.005),
                ('image_gen', 0.03),
                ('pdf_loader', 0.01)
            ON CONFLICT (service_type) DO NOTHING
        `;

        // File uploads (Cloud storage in DB)
        await sql`
            CREATE TABLE IF NOT EXISTS file_uploads (
                id VARCHAR(255) PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                data TEXT NOT NULL, -- Storing as Base64 string
                mime_type VARCHAR(100) DEFAULT 'application/pdf',
                size INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
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
