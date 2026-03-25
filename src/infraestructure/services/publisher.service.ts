import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PublisherService {
    constructor(
        @Inject('WHATSAPP_SERVICE')
        private readonly client: ClientProxy,
    ) { }

    async sendMessage(payload: any) {
        console.log('Enviando mensaje a RabbitMQ', payload);
        return this.client.emit('send_message_event', payload);
    }
}