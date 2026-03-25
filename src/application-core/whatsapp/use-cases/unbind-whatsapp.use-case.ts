import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { WhatsappSessionManagerUseCase } from './whatsapp-session-manager.use-case';

@Injectable()
export class UnbindWhatsappUseCase {
  private readonly logger = new Logger(UnbindWhatsappUseCase.name);

	constructor(
		private readonly whatsappSessionManagerUseCase: WhatsappSessionManagerUseCase,
	) {}
  
  async execute(customerId: string) {
    try {
			const currentSession = await this.whatsappSessionManagerUseCase.getSession(customerId);
			
			if (!currentSession) {
				throw new Error('No active session found for this customer');
			}

			currentSession.sock?.logout();
			this.whatsappSessionManagerUseCase.removeSession(customerId);
			
      this.logger.log(`Unbinding WhatsApp for customer: ${customerId}`);
      return {
        status: 'success',
        message: 'WhatsApp unbound successfully',
      };
    } catch (error) {
      this.logger.error('Error in UnbindWhatsappUseCase:', error);
      return {
        status: 'error',
        message: 'An error occurred while processing your request.',
      };
    }
  }
}