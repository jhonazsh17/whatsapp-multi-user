import { Module } from '@nestjs/common';
import { WhatsAppMultiUserService } from './services/whatsapp-multi-user.service';

const services = [ WhatsAppMultiUserService];

@Module({
  imports: [],
  providers: services,
  exports: services,
})
export class InfraestructureModule {}