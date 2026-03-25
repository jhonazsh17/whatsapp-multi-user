import { Module } from '@nestjs/common';
import { WhatsAppMultiUserService } from './services/whatsapp-multi-user.service';
import { EventsGateway } from './gateway/events.gateway';
import { PublisherService } from './services/publisher.service';
import { ConsumerService } from './services/consumer.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

const services = [WhatsAppMultiUserService, EventsGateway, PublisherService, ConsumerService];

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'WHATSAPP_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? ''],
          queue: 'whatsapp_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: services,
  exports: services,
})
export class InfraestructureModule { }