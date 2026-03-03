import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppMultiUserService } from '../../../infraestructure/services/whatsapp-multi-user.service';

@Injectable()
export class InitializeWhatsappUseCase {
    private logger = new Logger(InitializeWhatsappUseCase.name);

    constructor(
        private readonly whatsappMultiUserService: WhatsAppMultiUserService,
    ) { }

    async execute(customerId: string): Promise<any> {
        try {
            await this.whatsappMultiUserService.initialize(customerId);
            return {
                status: 'success',
                message: 'Whatsapp initialized successfully',
            };
        } catch (error: any) {
            console.log('Error in InitializeWhatsappUseCase:', error);
            return {
                status: 'error',
                message: 'An error occurred while processing your request.',
            };
        }
    }
}
