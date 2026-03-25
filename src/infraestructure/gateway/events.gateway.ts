import {
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: true,
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emitWhatsappConnected(data: any) {
    this.server.emit('whatsapp_connected', data);
  }

  emitGeneratedQr(data: any) {
    this.server.emit('generated_qr', data);
  }
}
