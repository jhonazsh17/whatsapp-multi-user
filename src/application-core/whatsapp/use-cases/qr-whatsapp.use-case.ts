import { Injectable, Logger } from '@nestjs/common';
import { WhatsappSessionManagerUseCase } from './whatsapp-session-manager.use-case';

@Injectable()
export class QrWhatsappUseCase {
    private logger = new Logger(QrWhatsappUseCase.name);

    constructor(
        private readonly whatsappSessionManagerUseCase: WhatsappSessionManagerUseCase,
    ) { }

    async execute(customerId: string): Promise<any> {
        try {
            const currentSession = this.whatsappSessionManagerUseCase.getSession(customerId);
            const qr = currentSession?.qr || null;

            return {
                status: 'success',
                message: 'QR code generated successfully',
                data: {qr},
            };
        } catch (error: any) {
            this.logger.error(`Error al generar el QR: ${error.message}`);
            return {
                status: 'error',
                message: 'An error occurred while processing your request.',
            };
        }
    }
}
