/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { JwtInterceptor } from '../../auth/jwt.interceptor';
import { AuthData } from '../../auth/auth-data.decorator';
import { InitializeWhatsappUseCase } from '../../application-core/whatsapp/use-cases/initialize-whatsapp.use-case';
import { QrWhatsappUseCase } from '../../application-core/whatsapp/use-cases/qr-whatsapp.use-case';
import { SendMessageWhatsappUseCase } from '../../application-core/whatsapp/use-cases/send-message-whatsapp.use-case';
import { CheckingStatusWhatsappUseCase } from '../../application-core/whatsapp/use-cases/checking-status-whatsapp.use-case';
import { RestartWhatsappUseCase } from '../../application-core/whatsapp/use-cases/restart-whatsapp.use-case';
import { SendMessagePayloadDTO } from '../../application-core/whatsapp/dto/send-message-payload.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

@ApiTags('WhatsApp Multi User')
@ApiBearerAuth('authorization')
@Controller('whatsapp-multi-user')
@UseInterceptors(JwtInterceptor)
export class WhatsappMultiUserController {
  constructor(
    private readonly initializeWhatsAppUseCase: InitializeWhatsappUseCase,
    private readonly qrWhatsappUseCase: QrWhatsappUseCase,
    private readonly sendMessageWhatsappUseCase: SendMessageWhatsappUseCase,
    private readonly checkingStatusWhatsappUseCase: CheckingStatusWhatsappUseCase,
    private readonly restartWhatsappUseCase: RestartWhatsappUseCase,
  ) {}

  @Post('init')
  @ApiConsumes('application/json')
  async initialize(@AuthData() authData: any): Promise<any> {
    const response = await this.initializeWhatsAppUseCase.execute(authData?.customer_id);
    return response;
  }

  @Get('qr')
  @ApiConsumes('application/json')
  async getQR(@AuthData() authData: any): Promise<any> {
    const response = await this.qrWhatsappUseCase.execute(authData?.customer_id);
    return response;
  }

  @Get('checking-status')
  @ApiConsumes('application/json')
  async getStatus(@AuthData() authData: any): Promise<any> {
    const response = await this.checkingStatusWhatsappUseCase.execute(authData?.customer_id);
    return response;
  }

  @Post('send-message')
  @ApiConsumes('application/json')
  @ApiBody({ type: SendMessagePayloadDTO })
  async sendMessage(
    @AuthData() authData: any,
    @Body() payload: SendMessagePayloadDTO,
  ): Promise<any> {
    const response = await this.sendMessageWhatsappUseCase.execute(payload, authData?.customer_id);
    return response;
  }

  @Post('restart')
  @ApiConsumes('application/json')
  async restart(@AuthData() authData: any): Promise<any> {
    const response = this.restartWhatsappUseCase.execute(authData?.customer_id);
    return response;
  }
}
