import { Module } from '@nestjs/common';
import { ApplicationCoreModule } from '../application-core/application-core.module';
import { WhatsappMultiUserController } from './controllers/whatsapp-multi-user.controller';
import { WhatsAppMultiUserService } from 'src/infraestructure/services/whatsapp-multi-user.service';

@Module({
  imports: [ApplicationCoreModule],
  controllers: [WhatsappMultiUserController],
  providers: [WhatsAppMultiUserService],
})
export class UserInterfaceModule {}
