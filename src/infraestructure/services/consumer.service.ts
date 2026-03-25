import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Injectable()
export class ConsumerService {
    @EventPattern('send_message_event')
    handleMessage(@Payload() data: any) {
        console.log('Mensaje recibido:', data);
    }
}