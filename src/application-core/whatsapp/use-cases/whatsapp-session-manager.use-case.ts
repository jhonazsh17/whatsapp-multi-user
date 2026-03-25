import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SessionData {
  sock: any;
  qr: string | null;
  isConnected: boolean;
  isInitialized: boolean;
  isReconnecting: boolean;
  qrShown: boolean;
  authFolderPath: string;
  lastActivity?: Date;
  storedSession?: any;
  useExistingSession?: boolean;
  isCancelled?: boolean; // Flag to indicate intentional cancellation
}

export class WhatsappSessionManagerUseCase {
  private logger = new Logger(WhatsappSessionManagerUseCase.name);
	private sessions: Map<string, any> = new Map();
  private sessionsFolderPath: string;

  constructor() {
    this.sessionsFolderPath = path.join(__dirname, '../../../../auth_info');
  }

  getSession(customerId: string) {
    let session = this.sessions.get(customerId);
    
    if (!session) {
      const sessionFromFile = this.loadSessionFromFile(customerId);
      if (sessionFromFile) {
        this.sessions.set(customerId, sessionFromFile);
        session = sessionFromFile;
      }
    }

    return session;
  }

  setSession(customerId: string, session: SessionData) {
    this.sessions.set(customerId, session);
  }

  removeSession(customerId: string) {
    this.sessions.delete(customerId);
    this.deleteSessionFolder(customerId);
  }

  private deleteSessionFolder(customerId: string) {
    try {
      const customerSessionsFolderPath = path.join(this.sessionsFolderPath, customerId);
      if (fs.existsSync(customerSessionsFolderPath)) {
        fs.rmSync(customerSessionsFolderPath, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.error('Error deleting session folder:', error);
    }
  }

  initializeSession(customerId: string): void {
    this.sessions.set(customerId, {
      sock: null,
      qr: null,
      isConnected: false,
      isReconnecting: false,
      isInitialized: false,
      qrShown: false,
      authFolderPath: path.join(this.sessionsFolderPath, customerId),
      lastActivity: new Date(),
      isCancelled: false
    });
  }
  
  private loadSessionFromFile(customerId: string): SessionData | null {
    try {
      if (fs.existsSync(this.sessionsFolderPath)) {
        const customerSessionsFolderPath = path.join(this.sessionsFolderPath, customerId);

        if (fs.existsSync(customerSessionsFolderPath)) {
          const files = fs.readdirSync(customerSessionsFolderPath);

          if (files.length === 0) return null;
          
          // Verificar cuál archivo contiene la información completa de la sesión
          const metadataFilePath = files.find(file => file === 'metadata.json');

          if (metadataFilePath) {
            const fullMetadataPath = path.join(customerSessionsFolderPath, metadataFilePath);
            const metadata = fs.readFileSync(fullMetadataPath, { encoding: 'utf-8' });
            const parsedMetadata = JSON.parse(metadata);
            
            // Initialize session with stored data
            const session: SessionData = {
              sock: null,
              qr: null,
              isConnected: false, // Will be updated when socket connects
              isInitialized: false, // Will be updated when socket initializes
              isReconnecting: false,
              qrShown: false,
              authFolderPath: customerSessionsFolderPath,
              lastActivity: new Date(),
              storedSession: parsedMetadata,
              useExistingSession: true,
              isCancelled: false
            };
            
            this.sessions.set(customerId, session);
            return session;
          }
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Error loading session from file:', error);
      return null;
    }
  }
}
