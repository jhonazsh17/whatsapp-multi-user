import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppMultiUserService } from '../../../infraestructure/services/whatsapp-multi-user.service';

@Injectable()
export class QrWhatsappUseCase {
    private logger = new Logger(QrWhatsappUseCase.name);

    constructor(
        private readonly whatsappMultiUserService: WhatsAppMultiUserService,
    ) { }

    async execute(customerId: string): Promise<any> {
        try {
            const qr = this.whatsappMultiUserService.getQR(customerId);
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
