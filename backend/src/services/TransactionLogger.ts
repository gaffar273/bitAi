import { getSQL } from './DatabaseService';
import { generateId } from '../utils/blockchain';
import { config } from '../config';

export interface Transaction {
    id: string;
    fromWallet: string;
    toWallet: string;
    amount: number;
    serviceType?: string;
    channelId?: string;
    gasCost: number;
    status: 'completed' | 'pending' | 'failed';
    createdAt: Date;
}

export interface WorkflowLog {
    id: string;
    orchestratorWallet: string;
    totalSteps: number;
    totalCost: number;
    totalDuration: number;
    status: 'completed' | 'failed';
    error?: string;
    createdAt: Date;
}

export class TransactionLogger {
    /**
     * Log a transaction to database
     */
    static async logTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
        const txId = generateId();

        console.log(`[TxLogger] Recording: ${tx.fromWallet.slice(0, 10)}... → ${tx.toWallet.slice(0, 10)}... | $${tx.amount}`);

        // If database is disabled, only log to console
        if (!config.enableDatabase) {
            return txId;
        }

        try {
            const sql = getSQL();
            if (!sql) {
                console.log('[TxLogger] Database not configured');
                return txId;
            }

            await sql`
                INSERT INTO transactions 
                (id, from_wallet, to_wallet, amount, service_type, channel_id, gas_cost, status) 
                VALUES (
                    ${txId}, 
                    ${tx.fromWallet}, 
                    ${tx.toWallet}, 
                    ${tx.amount}, 
                    ${tx.serviceType || null}, 
                    ${tx.channelId || null}, 
                    ${tx.gasCost}, 
                    ${tx.status}
                )
            `;
        } catch (error) {
            console.error('[TxLogger] Database error:', error);
            // Continue even if DB write fails
        }

        return txId;
    }

    /**
     * Log a workflow execution
     */
    static async logWorkflow(workflow: Omit<WorkflowLog, 'id' | 'createdAt'>, steps: Array<{
        stepNumber: number;
        serviceType: string;
        agentWallet: string;
        cost: number;
        duration: number;
        paymentTxId?: string;
    }>): Promise<string> {
        const workflowId = generateId();

        console.log(`[TxLogger] Workflow: ${workflow.totalSteps} steps | Total: $${workflow.totalCost} | Status: ${workflow.status}`);

        if (!config.enableDatabase) {
            return workflowId;
        }

        try {
            const sql = getSQL();
            if (!sql) {
                console.log('[TxLogger] Database not configured');
                return workflowId;
            }

            // Insert workflow
            await sql`
                INSERT INTO workflows 
                (id, orchestrator_wallet, total_steps, total_cost, total_duration, status, error) 
                VALUES (
                    ${workflowId}, 
                    ${workflow.orchestratorWallet}, 
                    ${workflow.totalSteps}, 
                    ${workflow.totalCost}, 
                    ${workflow.totalDuration}, 
                    ${workflow.status}, 
                    ${workflow.error || null}
                )
            `;

            // Insert workflow steps
            for (const step of steps) {
                await sql`
                    INSERT INTO workflow_steps 
                    (workflow_id, step_number, service_type, agent_wallet, cost, duration, payment_tx_id) 
                    VALUES (
                        ${workflowId}, 
                        ${step.stepNumber}, 
                        ${step.serviceType}, 
                        ${step.agentWallet}, 
                        ${step.cost}, 
                        ${step.duration}, 
                        ${step.paymentTxId || null}
                    )
                `;
            }

        } catch (error) {
            console.error('[TxLogger] Database error:', error);
        }

        return workflowId;
    }

    /**
     * Get transaction history
     */
    static async getTransactions(limit = 50, offset = 0): Promise<Transaction[]> {
        if (!config.enableDatabase) {
            return []; // Return empty if DB disabled
        }

        const sql = getSQL();
        if (!sql) return [];

        const result = await sql`
            SELECT 
                id, 
                from_wallet as "fromWallet", 
                to_wallet as "toWallet", 
                amount, 
                service_type as "serviceType", 
                channel_id as "channelId",
                gas_cost as "gasCost", 
                status, 
                created_at as "createdAt"
            FROM transactions 
            ORDER BY created_at DESC 
            LIMIT ${limit} OFFSET ${offset}
        `;

        return result as Transaction[];
    }

    /**
     * Get workflow history
     */
    static async getWorkflows(limit = 20, offset = 0): Promise<WorkflowLog[]> {
        if (!config.enableDatabase) {
            return [];
        }

        const sql = getSQL();
        if (!sql) return [];

        const result = await sql`
            SELECT 
                id, 
                orchestrator_wallet as "orchestratorWallet", 
                total_steps as "totalSteps", 
                total_cost as "totalCost",
                total_duration as "totalDuration", 
                status, 
                error, 
                created_at as "createdAt"
            FROM workflows 
            ORDER BY created_at DESC 
            LIMIT ${limit} OFFSET ${offset}
        `;

        return result as WorkflowLog[];
    }
}
