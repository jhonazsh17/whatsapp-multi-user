import { Injectable, Logger } from '@nestjs/common';
import { formatNumber } from '../../../helpers/utils';
import { SendMessagePayloadDTO } from '../dto/send-message-payload.dto';
import { WhatsappSessionManagerUseCase, SessionData } from './whatsapp-session-manager.use-case';
import { PublisherService } from '../../../infraestructure/services/publisher.service';

@Injectable()
export class SendMessageWhatsappUseCase {
    private logger = new Logger(SendMessageWhatsappUseCase.name);

    constructor(
        private readonly whatsappSessionManagerUseCase: WhatsappSessionManagerUseCase,
        private readonly publisherService: PublisherService,
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

            this.logger.log('Getting session for customer: ' + customerId);
            const currentSession = this.whatsappSessionManagerUseCase.getSession(customerId);

            if (!currentSession) {
                throw new Error('Session not found');
            }

            if (!currentSession.isConnected) {
                // TODO: Implementar lógica para reconectar sesión
            }

            const formattedPhoneNumber = formatNumber(phoneNumber) || '';

            this.logger.log('Checking if number exists in WhatsApp: ' + formattedPhoneNumber);
            const existsJid = await currentSession.sock?.onWhatsApp(formattedPhoneNumber);

            if (!existsJid || existsJid.length === 0) {
                throw new Error('The number does not exist in WhatsApp');
            }

            const contentMessage = {
                document: { url: pdfUrl },
                message: message || 'Aquí tienes tu documento.',
                caption: caption || 'Aquí tienes tu documento.',
                mimetype: 'application/pdf',
                fileName: filename || 'documento.pdf',
            }

            this.publisherService.sendMessage(contentMessage);

            this.logger.log('Sending message to ' + formattedPhoneNumber);
            currentSession.sock.sendMessage(formattedPhoneNumber, contentMessage);

            this.logger.log(`Message sent successfully to ${formattedPhoneNumber}`);
            return {
                status: 'success',
                message: 'Message sent successfully',
            };
        } catch (error: any) {
            this.logger.error('Error in SendMessageWhatsappUseCase:', error);
            return {
                status: 'error',
                message: 'An error occurred while processing your request.',
            };
        }
    }
}

