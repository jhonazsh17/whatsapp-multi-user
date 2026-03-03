import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppMultiUserService } from '../../../infraestructure/services/whatsapp-multi-user.service';

@Injectable()
export class CheckingStatusWhatsappUseCase {
    private logger = new Logger(CheckingStatusWhatsappUseCase.name);

    constructor(
        private readonly whatsappMultiUserService: WhatsAppMultiUserService,
    ) { }

    async execute(customerId: string): Promise<any> {
        try {
            let data = {};
            // evaluate if the session is stored
            const sessionResponse = await this.whatsappMultiUserService.getSessionByCustomerId(customerId);

            if (sessionResponse) {
                const me = sessionResponse?.sessionData?.me;
                delete sessionResponse.sessionData
                data = { 
                    session: { ...sessionResponse, me },
                    isSessionStored: true 
                }
            } else data = { isSessionStored: false }
            
            // evaluate the connection status
            const connectionStatusResponse = this.whatsappMultiUserService.getConnectionStatus(customerId);
            data = { ...data, ...connectionStatusResponse }

            return {
                status: 'success',
                message: 'Connection status retrieved successfully',
                data,
            };
        } catch (error: any) {
            this.logger.error(`Error al obtener el estado de conexión: ${error.message}`);
            return {
                status: 'error',
                message: 'An error occurred while processing your request.',
            };
        }
    }
}
