import { Injectable, Logger } from '@nestjs/common';
import { baileysLogger } from '../../../infraestructure/services/whatsapp-multi-user.service';
import { WhatsappSessionManagerUseCase } from './whatsapp-session-manager.use-case';
import { DisconnectReason, fetchLatestBaileysVersion, default as makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import { Boom } from '@hapi/boom';
import { EventsGateway } from '../../../infraestructure/gateway/events.gateway';
import * as os from 'os';

@Injectable()
export class InitializeWhatsappUseCase {
    private logger = new Logger(InitializeWhatsappUseCase.name);

    constructor(
        private readonly whatsappSessionManager: WhatsappSessionManagerUseCase,
        private readonly eventsGateway: EventsGateway
    ) { }

    async execute(customerId: string, useExistingSession: boolean = false): Promise<any> {
        try {
            const session = this.whatsappSessionManager.getSession(customerId);

            if (session && session.isInitialized) {
                this.logger.warn(` Session already initialized, skipping...`);
                throw new Error(`Session ${customerId} is already initialized`);
            }

            this.whatsappSessionManager.initializeSession(customerId);
            const currentSession = this.whatsappSessionManager.getSession(customerId);

            if (!fs.existsSync(currentSession.authFolderPath)) {
                fs.mkdirSync(currentSession.authFolderPath, { recursive: true });
            }

            const { state, saveCreds } = await useMultiFileAuthState(
                currentSession.authFolderPath
            );

            currentSession.isInitialized = true;

            const { version } = await fetchLatestBaileysVersion();
            
            // Get dynamic device information
            const deviceInfo = this.getDeviceInfo();
            const browserInfo = this.getBrowserInfo();

            currentSession.sock = makeWASocket({
                version,
                auth: state,
                logger: baileysLogger,
                printQRInTerminal: false,
                connectTimeoutMs: 60000,
                retryRequestDelayMs: 5000,
                browser: browserInfo,
            });

            this.whatsappSessionManager.setSession(customerId, currentSession);

            currentSession.sock.ev.process(async (events: any) => {
                if (events['connection.update']) {
                    await this.handleConnection(events['connection.update'], customerId, useExistingSession);
                }
                
                if (events['creds.update']) await saveCreds();

                // Handle incoming messages
                if (events['messages.upsert']) {
                    // TODO: Implement handleIncomingMessages method
                    const messages = events['messages.upsert'];
                    console.log(`📨 Messages received for session ${customerId}:`, messages);
                }

                // Handle message updates (read receipts, etc.)
                if (events['messages.update']) {
                    // TODO: Implement handleMessageUpdates method
                    console.log(`📝 Message updates for session ${customerId}:`, events['messages.update']);
                }
            });
            
            return {
                status: 'success',
                message: 'Whatsapp initialized successfully',
            };
        } catch (error: any) {
            console.log('Error in InitializeWhatsappUseCase:', error);
            // TODO: Agregar esta línea de ser necesario
            // this.whatsappSessionManager.removeSession(customerId);
            return {
                status: 'error',
                message: 'An error occurred while processing your request.',
            };
        }
    }

    async handleConnection(update: any, customerId: string, useExistingSession: boolean = false): Promise<void> {
        const sessionData = this.whatsappSessionManager.getSession(customerId);
        if (!sessionData) return;
    
        const { connection, lastDisconnect, qr } = update;
    
        if (qr && !sessionData.qrShown && !useExistingSession) {
          sessionData.qrShown = true;
          this.logger.log(`📱 [${customerId}] New session - Scan this QR code with WhatsApp.`);
          sessionData.qr = await QRCode.toDataURL(qr);
          this.whatsappSessionManager.setSession(customerId, sessionData);
    
          // Emit QR generation event to frontend
          this.eventsGateway.emitGeneratedQr({
            customerId,
            qr: sessionData.qr,
            message: 'QR code generated for WhatsApp connection'
          });
    
          // Reset flag after 30 seconds (in case scan fails)
          setTimeout(() => {
            const currentSession = this.whatsappSessionManager.getSession(customerId);
            if (currentSession) {
              currentSession.qrShown = false;
            }
          }, 30000);
        }
    
        if (connection === 'close') {
          const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
    
          this.logger.warn(
            `⚠️  [${customerId}] Connection closed. Code: ${statusCode}. Reconnect? ${shouldReconnect}`
          );
    
          // Check if session was intentionally cancelled
          if (sessionData.isCancelled) {
            this.logger.log(`🚫 [${customerId}] Session was cancelled, preventing reconnection`);
            return;
          }
    
          if (shouldReconnect && !sessionData.isReconnecting) {
            sessionData.isReconnecting = true;
            sessionData.qrShown = false;
            sessionData.sock = null;
            this.logger.log(
              `🔄 [${customerId}] Reconnecting in ${10000 / 1000} seconds...`
            );

            setTimeout(() => {
              const currentSession = this.whatsappSessionManager.getSession(customerId);
              if (currentSession && !currentSession.isCancelled) {
                // Reset initialization state before reconnecting
                currentSession.isReconnecting = false;
                currentSession.isInitialized = false;
                this.whatsappSessionManager.setSession(customerId, currentSession);
                this.logger.log(`🔄 [${customerId}] Reset initialization state for reconnection...`);
                
                // Restart the connection process
                this.logger.log(`🔄 [${customerId}] Starting reconnection process...`);
                this.execute(customerId, false);
              }
            }, 10000);
          } else if (!shouldReconnect) {
            this.logger.error(
              `❌ [${customerId}] Session closed (logged out). Cleaning and restarting...`
            );
            sessionData.isReconnecting = true;
    
            // Clean current socket
            sessionData.sock = null;
            sessionData.qrShown = false;
            this.whatsappSessionManager.setSession(customerId, sessionData);
    
            // Delete auth folder and restart
            const fsPromises = await import('fs/promises');
            
            try {
              await fsPromises.rm(sessionData.authFolderPath, { recursive: true, force: true });
              this.logger.log(`✅ [${customerId}] Auth folder deleted`);
            } catch (error) {
              this.logger.warn(`⚠️  [${customerId}] Could not delete auth folder:`, error.message);
            }
    
            setTimeout(() => {
              const currentSession = this.whatsappSessionManager.getSession(customerId);
              if (currentSession) {
                currentSession.isReconnecting = false;
                this.whatsappSessionManager.setSession(customerId, currentSession);
                this.execute(customerId, true);
              }
            }, 3000);
          }
        } else if (connection === 'open') {
          sessionData.isConnected = true;
          this.whatsappSessionManager.setSession(customerId, sessionData);
          this.logger.log(`✅ [${customerId}] Bot connected successfully as: ${sessionData.sock?.user?.id}`);  
          this.logger.log(`📱 [${customerId}] Name: ${sessionData.sock?.user?.name || 'No name'}`);
          
          // Guardar metadatos de la sesión
          if (!useExistingSession) await this.saveSessionMetadata(customerId, sessionData);
          
          // Emit ready event to frontend (QR was scanned successfully)
          this.eventsGateway.emitWhatsappConnected({
            customerId,
            user: sessionData.sock?.user,
            message: 'WhatsApp connected successfully - QR scanned'
          });
        } else if (connection === 'connecting') {
          this.logger.log(`🔌 [${customerId}] Connecting to WhatsApp...`);
        }
    }

    private async saveSessionMetadata(customerId: string, sessionData: any): Promise<void> {
        try {
            const user = sessionData.sock?.user;
            if (!user) {
                this.logger.warn(`⚠️  [${customerId}] No user data available for metadata`);
                return;
            }

            const metadata = {
                user: {
                    id: user.id,
                    name: user.name || 'Unknown',
                    verified: user.verified || false,
                    phone: user.id ? user.id.split('@')[0] : null
                },
                connection: {
                    linkedAt: new Date().toISOString(),
                    customerId: customerId,
                    device: this.getDeviceInfo(),
                    version: '1.0.0',
                    lastReconnection: new Date().toISOString()
                },
                status: {
                    isActive: true,
                    lastActivity: new Date().toISOString()
                }
            };

            const metadataPath = `${sessionData.authFolderPath}/metadata.json`;
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            
            this.logger.log(`✅ [${customerId}] Session metadata saved successfully`);
        } catch (error: any) {
            this.logger.error(`❌ [${customerId}] Error saving session metadata: ${error.message}`);
        }
    }

    private getDeviceInfo(): string {
        try {
            const platform = os.platform();
            const arch = os.arch();
            const release = os.release();
            
            // Get more descriptive platform name
            let platformName = '';
            switch (platform) {
                case 'win32':
                    platformName = 'Windows';
                    break;
                case 'darwin':
                    platformName = 'macOS';
                    break;
                case 'linux':
                    platformName = 'Linux';
                    break;
                default:
                    platformName = platform;
            }
            
            return `${platformName} ${release} (${arch})`;
        } catch (error) {
            this.logger.warn('Could not get device info, using default');
            return 'Unknown Device';
        }
    }

    private getBrowserInfo(): [string, string, string] {
        try {
            const deviceInfo = this.getDeviceInfo();
            const platform = os.platform();
            
            // Determine browser name based on platform
            let browserName = 'Chrome';
            let osName = '';
            
            switch (platform) {
                case 'win32':
                    osName = 'Windows';
                    break;
                case 'darwin':
                    osName = 'macOS';
                    break;
                case 'linux':
                    osName = 'Linux';
                    break;
                default:
                    osName = platform;
            }
            
            // Create professional browser description
            const browserDescription = `${browserName} (${osName})`;
            
            return [browserDescription, deviceInfo, ''];
        } catch (error) {
            this.logger.warn('Could not get browser info, using default');
            return ['Chrome (Linux)', '', ''];
        }
    }
}
