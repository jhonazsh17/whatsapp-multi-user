import { Injectable, Logger } from '@nestjs/common';
import { InitializeWhatsappUseCase } from './initialize-whatsapp.use-case';
import { WhatsappSessionManagerUseCase } from './whatsapp-session-manager.use-case';

@Injectable()
export class RestartWhatsappUseCase {
    private logger = new Logger(RestartWhatsappUseCase.name);

    constructor(
        private readonly initializeWhatsappUseCase: InitializeWhatsappUseCase,
        private readonly whatsappSessionManagerUseCase: WhatsappSessionManagerUseCase
    ) { }

    async execute(customerId: string): Promise<any> {
        try {
            // Check if existing session exists
            this.logger.log('Getting current session for customer: ' + customerId);
            const currentSession = await this.whatsappSessionManagerUseCase.getSession(customerId);

            if (currentSession?.isConnected) {
                throw new Error('Session is already connected');
            }

            // Initialize using existing session data
            this.logger.log('Restarting WhatsApp for customer: ' + customerId);
            const initResult = await this.initializeWhatsappUseCase.execute(customerId, true);

            this.logger.log('WhatsApp restarted successfully for customer: ' + customerId);
            return {
                success: true,
                status: 'success',
                message: 'WhatsApp restarted successfully using existing session',
                sessionInfo: {}
            };
        } catch (error: any) {
            this.logger.error(`Error al reiniciar el WhatsApp: ${error.message}`);
            return {
                success: false,
                status: 'error',
                message: 'An error occurred while processing your request.',
            };
        }
    }
}
