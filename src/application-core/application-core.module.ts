import { Module } from '@nestjs/common';

import { InitializeWhatsappUseCase } from './whatsapp/use-cases/initialize-whatsapp.use-case';
import { InfraestructureModule } from 'src/infraestructure/infraestructure.module';
import { SendMessageWhatsappUseCase } from './whatsapp/use-cases/send-message-whatsapp.use-case';
import { QrWhatsappUseCase } from './whatsapp/use-cases/qr-whatsapp.use-case';
import { CheckingStatusWhatsappUseCase } from './whatsapp/use-cases/checking-status-whatsapp.use-case';
import { RestartWhatsappUseCase } from './whatsapp/use-cases/restart-whatsapp.use-case';

const services = [
  InitializeWhatsappUseCase,
  SendMessageWhatsappUseCase,
  QrWhatsappUseCase,
  CheckingStatusWhatsappUseCase,
  RestartWhatsappUseCase,
];

@Module({
  imports: [
    InfraestructureModule,
  ],
  providers: services,
  exports: services,
})
export class ApplicationCoreModule {}

