import { Injectable, Logger } from '@nestjs/common';
import { WhatsappSessionManagerUseCase } from './whatsapp-session-manager.use-case';
import * as fs from 'fs';
import * as path from 'path';

interface ConnectionStatus {
    isSessionStored: boolean;
    isConnected: boolean;
    isInitialized: boolean;
    session: any;
}
@Injectable()
export class CheckingStatusWhatsappUseCase {
    private logger = new Logger(CheckingStatusWhatsappUseCase.name);

    constructor(
        private readonly whatsappSessionManagerUseCase: WhatsappSessionManagerUseCase,
    ) { }

    async execute(customerId: string): Promise<any> {
        try {
            let data: ConnectionStatus = {
                isSessionStored: false,
                isConnected: false,
                isInitialized: false,
                session: null
            };

            // evaluate if the session is stored in memory or file
            let currentSession = this.whatsappSessionManagerUseCase.getSession(customerId);

            if (currentSession) {
                // Session found in memory
                if (currentSession?.storedSession) {
                    const me = currentSession?.storedSession?.user?.id;
                    data = { 
                        session: { ...currentSession?.storedSession, me },
                        isSessionStored: true,
                        isConnected: currentSession.isConnected || false,
                        isInitialized: currentSession.isInitialized || false
                    }
                } else {
                    // Check if session files exist even if not in memory
                    const sessionFiles = this.loadSessionFiles(customerId);
                    if (sessionFiles) {
                        data = {
                            session: sessionFiles,
                            isSessionStored: true,
                            isConnected: currentSession.isConnected || false,
                            isInitialized: currentSession.isInitialized || false
                        }
                    }
                }
            } else {
                // Try to load session from files directly
                const sessionFiles = this.loadSessionFiles(customerId);
                if (sessionFiles) {
                    data = {
                        session: sessionFiles,
                        isSessionStored: true,
                        isConnected: false,
                        isInitialized: false
                    }
                }
            }

            return {
                status: 'success',
                message: 'Connection status retrieved successfully',
                data,
            };
        } catch (error: any) {
            this.logger.error(`Error al obtener el estado de conexión: ${error.message}`);
            return {
                status: 'error',
                message: 'An error occurred while processing your request.',
            };
        }
    }

    private loadSessionFiles(customerId: string): any {
        try {
            const sessionsFolderPath = path.join(__dirname, '../../../../auth_info');
            const customerSessionsFolderPath = path.join(sessionsFolderPath, customerId);

            if (fs.existsSync(customerSessionsFolderPath)) {
                const metadataFilePath = path.join(customerSessionsFolderPath, 'metadata.json');
                
                if (fs.existsSync(metadataFilePath)) {
                    const metadata = fs.readFileSync(metadataFilePath, { encoding: 'utf-8' });
                    const parsedMetadata = JSON.parse(metadata);
                    const me = parsedMetadata?.user?.id;
                    
                    return {
                        ...parsedMetadata,
                        me
                    };
                }
            }
            return null;
        } catch (error) {
            this.logger.error('Error loading session files:', error);
            return null;
        }
    }
}
