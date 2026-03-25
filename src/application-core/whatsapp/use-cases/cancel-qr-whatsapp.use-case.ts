import { Injectable, Logger } from '@nestjs/common';
import { WhatsappSessionManagerUseCase } from './whatsapp-session-manager.use-case';
import * as fs from 'fs';

@Injectable()
export class CancelQrWhatsappUseCase {
    private logger = new Logger(CancelQrWhatsappUseCase.name);

    constructor(
        private readonly whatsappSessionManager: WhatsappSessionManagerUseCase,
    ) {}

    async execute(customerId: string): Promise<any> {
        try {
            const session = this.whatsappSessionManager.getSession(customerId);

            if (!session) {
                this.logger.warn(`⚠️  [${customerId}] No active session found to cancel`);
                throw new Error('No active session found to cancel');
            }

            // Close socket if it exists and is not connected
            if (session.sock && !session.isConnected) {
                try {
                    session.sock.end();
                    this.logger.log(`📱 [${customerId}] Socket closed during QR cancellation`);
                } catch (error) {
                    this.logger.warn(`⚠️  [${customerId}] Error closing socket: ${error.message}`);
                }
            }

            // Reset session state and prevent auto-reconnection
            session.qrShown = false;
            session.qr = null;
            session.isInitialized = false;
            session.isReconnecting = true; // Prevent auto-reconnection
            session.isCancelled = true; // Mark as intentionally cancelled
            session.sock = null;

            // Update session
            this.whatsappSessionManager.setSession(customerId, session);

            // Clean up auth folder if exists (optional - removes partial session data)
            if (fs.existsSync(session.authFolderPath)) {
                try {
                    const files = fs.readdirSync(session.authFolderPath);
                    // Only remove if it's not a complete session (no metadata.json)
                    if (!files.includes('metadata.json')) {
                        fs.rmSync(session.authFolderPath, { recursive: true, force: true });
                        this.logger.log(`🗑️  [${customerId}] Incomplete auth folder cleaned`);
                    }
                } catch (error) {
                    this.logger.warn(`⚠️  [${customerId}] Error cleaning auth folder: ${error.message}`);
                }
            }

            this.logger.log(`✅ [${customerId}] QR scanning cancelled successfully`);

            return {
                status: 'success',
                message: 'QR scanning cancelled successfully',
                data: {
                    cancelled: true,
                    customerId,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error: any) {
            this.logger.error(`❌ [${customerId}] Error cancelling QR: ${error.message}`);
            return {
                status: 'error',
                message: 'An error occurred while cancelling QR scanning',
                error: error.message
            };
        }
    }
}
