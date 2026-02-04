import { YellowService } from './YellowService';
import { TransactionLogger } from './TransactionLogger';
import { generateId } from '../utils/blockchain';

export class PaymentService {
    /**
     * Transfer funds with automatic transaction logging
     */
    static async transfer(
        channelId: string,
        from: string,
        to: string,
        amount: number,
        privateKey?: string
    ) {
        // Execute payment via Yellow
        const result = await YellowService.sendPayment(
            channelId,
            from,
            to,
            amount.toString(),
            privateKey
        );

        // Log transaction
        await TransactionLogger.logTransaction({
            fromWallet: from,
            toWallet: to,
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
}
