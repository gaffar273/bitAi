import { YellowService } from './YellowService';
import { TransactionLogger } from './TransactionLogger';
import { generateId } from '../utils/blockchain';
import {
    WorkflowPayment,
    ParticipantShare,
    ContributionMetrics,
    PRICE_FLOORS,
    COMPLEXITY_SCORES
} from '../types';

export class PaymentService {
    /**
     * Transfer funds with automatic transaction logging
     */
    static async transfer(
        channelId: string,
        from: string,
        to: string,
        amount: number,
        privateKey?: string,
        actualRecipient?: string // For logging the actual agent that provided service
    ) {
        // Execute payment via Yellow
        const result = await YellowService.sendPayment(
            channelId,
            from,
            to,
            amount.toString(),
            privateKey
        );

        // Log transaction - use actualRecipient for tracking which agent was paid
        await TransactionLogger.logTransaction({
            fromWallet: from,
            toWallet: actualRecipient || to,
            amount,
            channelId,
            gasCost: 0, // Yellow state channels = 0 gas
            status: 'completed'
        });

        return result;
    }

    /**
     * Open a channel
     */
    static async openChannel(
        agentA: string,
        agentB: string,
        balanceA: string,
        balanceB: string,
        privateKey?: string
    ) {
        return await YellowService.createSession(agentA, agentB, balanceA, balanceB, privateKey);
    }

    /**
     * Settle a channel
     */
    static async settle(channelId: string, privateKey?: string) {
        return await YellowService.settle(channelId, privateKey);
    }

    /**
     * Get channel state
     */
    static async getChannel(channelId: string) {
        return await YellowService.getChannel(channelId);
    }

    /**
     * Get channel state update
     */
    static async getState(channelId: string) {
        return await YellowService.getState(channelId);
    }

    /**
     * Validate pricing against floor
     */
    static validatePricing(serviceType: string, priceUsdc: number): boolean {
        const floor = PRICE_FLOORS[serviceType] || 0.005;
        return priceUsdc >= floor;
    }

    /**
     * Get minimum price for a service
     */
    static getPriceFloor(serviceType: string): number {
        return PRICE_FLOORS[serviceType] || 0.005;
    }
}

/**
 * Revenue Share Distribution Service
 * Calculates dynamic contribution weights and distributes payments
 */
export class RevenueShareService {

    /**
     * Calculate contribution weight for a single participant
     * Weight formula: 0.30*complexity + 0.25*time + 0.25*quality + 0.20*outputSize
     */
    static calculateWeight(metrics: ContributionMetrics, maxTimeMs: number, maxOutputBytes: number): number {
        const weights = {
            complexity: 0.30,
            processingTime: 0.25,
            quality: 0.25,
            outputSize: 0.20,
        };

        // Normalize processing time (longer = higher contribution, capped at max)
        const timeScore = Math.min(metrics.processingTimeMs / maxTimeMs, 1.0);

        // Normalize output size
        const outputScore = maxOutputBytes > 0
            ? Math.min(metrics.outputSizeBytes / maxOutputBytes, 1.0)
            : 0.5;

        return (
            weights.complexity * metrics.complexityScore +
            weights.processingTime * timeScore +
            weights.quality * metrics.qualityScore +
            weights.outputSize * outputScore
        );
    }

    /**
     * Calculate weights for all participants and normalize to sum to 1.0
     */
    static calculateWeights(participants: { wallet: string; serviceType: string; metrics: ContributionMetrics }[]): ParticipantShare[] {
        if (participants.length === 0) return [];

        // Find max values for normalization
        const maxTime = Math.max(...participants.map(p => p.metrics.processingTimeMs), 1);
        const maxOutput = Math.max(...participants.map(p => p.metrics.outputSizeBytes), 1);

        // Calculate raw weights
        const rawWeights = participants.map(p => ({
            ...p,
            rawWeight: this.calculateWeight(p.metrics, maxTime, maxOutput)
        }));

        // Normalize weights to sum to 1.0
        const totalWeight = rawWeights.reduce((sum, p) => sum + p.rawWeight, 0);

        return rawWeights.map(p => ({
            agentWallet: p.wallet,
            serviceType: p.serviceType,
            rawWeight: p.rawWeight,
            normalizedWeight: totalWeight > 0 ? p.rawWeight / totalWeight : 1 / participants.length,
            finalPayment: 0, // Will be set by distributePayments
            metrics: p.metrics,
        }));
    }

    /**
     * Distribute total payment among participants based on their weights
     */
    static distributePayments(
        workflowId: string,
        totalAmount: number,
        participants: { wallet: string; serviceType: string; metrics: ContributionMetrics }[]
    ): WorkflowPayment {
        const shares = this.calculateWeights(participants);

        // Calculate final payments based on normalized weights
        shares.forEach(share => {
            share.finalPayment = Math.round(totalAmount * share.normalizedWeight * 1000000) / 1000000; // 6 decimal places
        });

        return {
            id: generateId(),
            workflowId,
            totalAmount,
            participants: shares,
            distributedAt: new Date(),
        };
    }

    /**
     * Get complexity score for a service type
     */
    static getComplexityScore(serviceType: string): number {
        return COMPLEXITY_SCORES[serviceType] || 0.5;
    }

    /**
     * Create metrics from execution data
     */
    static createMetrics(
        serviceType: string,
        processingTimeMs: number,
        outputSizeBytes: number,
        qualityScore: number = 1.0
    ): ContributionMetrics {
        return {
            complexityScore: this.getComplexityScore(serviceType),
            processingTimeMs,
            outputSizeBytes,
            qualityScore,
        };
    }
}
