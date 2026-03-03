import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppMultiUserService } from '../../../infraestructure/services/whatsapp-multi-user.service';

@Injectable()
export class RestartWhatsappUseCase {
    private logger = new Logger(RestartWhatsappUseCase.name);

    constructor(
        private readonly whatsappMultiUserService: WhatsAppMultiUserService,
    ) { }

    async execute(customerId: string): Promise<any> {
        try {
            // Check if existing session exists
            const existingSession = await this.whatsappMultiUserService.getSessionByCustomerId(customerId);
            
            if (!existingSession) {
                return {
                    success: false,
                    status: 'error',
                    message: `No existing session found for customer: ${customerId}`,
                };
            }

            console.log('Existing session found:', existingSession.fileName);

            // Initialize using existing session data
            const initResult = await this.whatsappMultiUserService.initialize(customerId, existingSession);
            
            if (initResult.status === 'error') {
                return {
                    success: false,
                    status: 'error',
                    message: initResult.message,
                };
            }

            return {
                success: true,
                status: 'success',
                message: 'WhatsApp restarted successfully using existing session',
                sessionInfo: {
                    fileName: existingSession.fileName,
                    environment: existingSession.environment
                }
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
