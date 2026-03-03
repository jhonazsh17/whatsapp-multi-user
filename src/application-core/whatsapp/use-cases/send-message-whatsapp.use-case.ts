import { Injectable, Logger } from '@nestjs/common';
import logger from '@whiskeysockets/baileys/lib/Utils/logger';
import { formatNumber } from '../../../helpers/utils';
import { WhatsAppMultiUserService } from 'src/infraestructure/services/whatsapp-multi-user.service';
import { RestartWhatsappUseCase } from './restart-whatsapp.use-case';
import { SendMessagePayloadDTO } from '../dto/send-message-payload.dto';

@Injectable()
export class SendMessageWhatsappUseCase {
    private logger = new Logger(SendMessageWhatsappUseCase.name);

    constructor(
        private readonly whatsappMultiUserService: WhatsAppMultiUserService,
        private readonly restartWhatsappUseCase: RestartWhatsappUseCase,
    ) { }

    async execute(
        payload: SendMessagePayloadDTO,
        customerId: string
    ): Promise<any> {
        try {
            const { phoneNumber, pdfUrl, caption, filename, message } = payload;
            if (!phoneNumber || !pdfUrl) {
                throw new Error('Missing phoneNumber or pdfUrl');
            }

            const sock = this.whatsappMultiUserService.getSocket(customerId);
            if (!sock) {
                this.restartWhatsappUseCase.execute(customerId);
            }

            const number = formatNumber(phoneNumber) || '';
            const exists = await this.whatsappMultiUserService.numberExistsOnWhatsApp(customerId, number);

            if (!exists) {
                logger.warn(`❌ Número no encontrado en WhatsApp: ${number}`);
                throw new Error('The number does not exist in WhatsApp');
            }

            await this.whatsappMultiUserService.sendMessage(customerId, number, {
                document: { url: pdfUrl },
                message: message || 'Aquí tienes tu documento.',
                caption: caption || 'Aquí tienes tu documento.',
                mimetype: 'application/pdf',
                fileName: filename || 'documento.pdf',
            });
            logger.info(`✅ Mensaje enviado vía API a ${number}`);

            return {
                status: 'success',
                message: 'Message sent successfully',
            };
        } catch (error: any) {
            console.log('Error in SendMessageWhatsappUseCase:', error);
            return {
                status: 'error',
                message: 'An error occurred while processing your request.',
            };
        }
    }
}
