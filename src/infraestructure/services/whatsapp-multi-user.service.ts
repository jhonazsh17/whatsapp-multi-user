import { Injectable, Logger } from "@nestjs/common";
import { DisconnectReason, fetchLatestBaileysVersion, default as makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from '@hapi/boom'
import * as fs from 'fs'
import * as path from 'path'
import * as QRCode from 'qrcode'

interface SessionData {
  sock: any;
  qr: string | null;
  isConnected: boolean;
  isInitializing: boolean;
  isReconnecting: boolean;
  qrShown: boolean;
  authFolderPath: string;
  lastActivity?: Date;
}

export const baileysLogger = {
  level: 'silent',
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => baileysLogger,
};

@Injectable()
export class WhatsAppMultiUserService {
  private readonly logger = new Logger(WhatsAppMultiUserService.name);
  private sessions: Map<string, SessionData> = new Map();
  private baseAuthFolderPath = 'auth_info';

  constructor() {}

  /**
   * Initialize WhatsApp connection for a specific session
   * @param sessionId - Session identifier
   * @param useExistingSession - Whether to use existing session data if available
   * @returns {Promise<any>} - Initialization response
   */
  async initialize(customerId: string, useExistingSession: boolean = false): Promise<any> {
    // Check if session already exists
    if (this.sessions.has(customerId)) {
      const sessionData = this.sessions.get(customerId);
      if (sessionData?.isInitializing) {
        return {
          status: 'warning',
          message: `Session ${customerId} is already initializing`
        };
      }
    }

    // If useExistingSession is true, check if session exists and load its data
    if (useExistingSession) {
      const existingSession = await this.getSessionByCustomerId(customerId);
      if (!existingSession) {
        return {
          status: 'error',
          message: `No existing session found for ${customerId}`
        };
      }
    }

    // Create or get session data
    if (!this.sessions.has(customerId)) {
      this.sessions.set(customerId, {
        sock: null,
        qr: null,
        isConnected: false,
        isInitializing: false,
        authFolderPath: path.join(this.baseAuthFolderPath, customerId),
        isReconnecting: false,
        qrShown: false,
        lastActivity: new Date()
      });
    }

    const sessionData = this.sessions.get(customerId);
    if (!sessionData) {
      return {
        status: 'error',
        message: `Session ${customerId} could not be created`
      };
    }
    
    sessionData.isInitializing = true;

    try {
      // Check if auth folder exists, create if not
      const fs = require('fs');
      if (!fs.existsSync(sessionData.authFolderPath)) {
        fs.mkdirSync(sessionData.authFolderPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(
        sessionData.authFolderPath
      );
      const { version } = await fetchLatestBaileysVersion();

      sessionData.sock = makeWASocket({
        version,
        auth: state,
        logger: baileysLogger,
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 5000,
        browser: ['Chrome (Linux)', '', ''],
      });

      // Setup event handlers
      sessionData.sock.ev.process(async (events) => {
        if (events['connection.update']) {
          await this.handleConnection(events['connection.update'], customerId);
        }
        
        if (events['creds.update']) {
          await saveCreds();
        }

        // Handle incoming messages
        if (events['messages.upsert']) {
          // TODO: Implement handleIncomingMessages method
          //console.log(`📨 New messages for session ${customerId}:`, events['messages.upsert']);
        }

        // Handle message updates (read receipts, etc.)
        if (events['messages.update']) {
          // TODO: Implement handleMessageUpdates method
          //console.log(`📝 Message updates for session ${customerId}:`, events['messages.update']);
        }
      });

      this.logger.log(`✅ Session ${customerId} initialization started`);
      
      return {
        status: 'success',
        message: `Session ${customerId} initialization started`,
        customerId
      };
    } catch (error) {
      sessionData.isInitializing = false;
      this.logger.error(`❌ Error initializing session ${customerId}:`, error);
      return {
        status: 'error',
        message: `Failed to initialize session ${customerId}: ${error.message}`,
        customerId
      };
    }
  }

  /**
   * Handle connection updates for a specific user/session
   * @param update - Connection update from Baileys
   * @param customerId - Customer ID for the session
   * @returns {Promise<void>}
   */
  async handleConnection(update: any, customerId: string): Promise<void> {
    const sessionData = this.sessions.get(customerId);
    if (!sessionData) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr && !sessionData.qrShown) {
      sessionData.qrShown = true;
      this.logger.log(`📱 [${customerId}] Scan this QR code with WhatsApp.`);
      sessionData.qr = await QRCode.toDataURL(qr);

      // Reset flag after 30 seconds (in case scan fails)
      setTimeout(() => {
        const currentSession = this.sessions.get(customerId);
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

      if (shouldReconnect && !sessionData.isReconnecting) {
        sessionData.isReconnecting = true;
        sessionData.qrShown = false;
        sessionData.sock = null;
        this.logger.log(
          `🔄 [${customerId}] Reconnecting in ${5000 / 1000} seconds...`
        );
        setTimeout(() => {
          const currentSession = this.sessions.get(customerId);
          if (currentSession) {
            currentSession.isReconnecting = false;
            this.initialize(customerId);
          }
        }, 5000);
      } else if (!shouldReconnect) {
        this.logger.error(
          `❌ [${customerId}] Session closed (logged out). Cleaning and restarting...`
        );
        sessionData.isReconnecting = true;

        // Clean current socket
        sessionData.sock = null;
        sessionData.qrShown = false;

        // Delete auth folder and restart
        const fsPromises = await import('fs/promises');
        try {
          await fsPromises.rm(sessionData.authFolderPath, { recursive: true, force: true });
          this.logger.log(`✅ [${customerId}] Auth folder deleted`);
        } catch (error) {
          this.logger.warn(`⚠️  [${customerId}] Could not delete auth folder:`, error.message);
        }

        setTimeout(() => {
          const currentSession = this.sessions.get(customerId);
          if (currentSession) {
            currentSession.isReconnecting = false;
            this.initialize(customerId);
          }
        }, 3000);
      }
    } else if (connection === 'open') {
      sessionData.isConnected = true;
      this.logger.log(`✅ [${customerId}] Bot connected successfully as: ${sessionData.sock?.user?.id}`);  
      this.logger.log(`📱 [${customerId}] Name: ${sessionData.sock?.user?.name || 'No name'}`);
    } else if (connection === 'connecting') {
      this.logger.log(`🔌 [${customerId}] Connecting to WhatsApp...`);
    }
  }

  /**
   * Get QR code for a customer
   * @param customerId - Customer ID
   * @returns {string | null}
   */
  public getQR(customerId: string): string | null {
    this.logger.log(`Getting QR for customer: ${customerId}`);
    const sessionData = this.sessions.get(customerId);
    return sessionData?.qr || null;
  }

  /**
   * Get connection status for a customer
   * @param customerId - Customer ID
   * @returns {Object}
   */
  public getConnectionStatus(customerId: string): { isConnected: boolean; isInitializing: boolean } {
    this.logger.log(`Getting connection status for customer: ${customerId}`);
    const sessionData = this.sessions.get(customerId);
    return {
      isConnected: sessionData?.isConnected || false,
      isInitializing: sessionData?.isInitializing || false
    };
  }

  /**
   * Get socket for a customer
   * @param customerId - Customer ID
   * @returns {any}
   */
  public getSocket(customerId: string): any {
    this.logger.log(`Getting socket for customer: ${customerId}`);
    const sessionData = this.sessions.get(customerId);
    return sessionData?.sock || null;
  }

  /**
   * Send a message using the WhatsApp socket
   * @param customerId - Customer ID
   * @param jid - Recipient JID
   * @param content - Message content
   * @returns {Promise<any>}
   */
  public async sendMessage(customerId: string, jid: string, content: any): Promise<any> {
    const sessionData = this.sessions.get(customerId);
    if (!sessionData?.sock) {
      throw new Error(`WhatsApp socket for customer ${customerId} is not initialized`);
    }
    return await sessionData.sock.sendMessage(jid, content);
  }

  /**
   * Check if a number exists on WhatsApp
   * @param customerId The customer ID
   * @param jid The JID (WhatsApp ID) to check
   * @returns {Promise<boolean>} - true if the number exists on WhatsApp, false otherwise
   */
  public async numberExistsOnWhatsApp(customerId: string, jid: string): Promise<boolean> {
    this.logger.log(`Getting session for customer: ${customerId}`);
    const sessionData = this.sessions.get(customerId);

    this.logger.log(`Evaluating if socket exists for customer: ${customerId}`, sessionData);
    if (!sessionData?.sock) {
      throw new Error(`WhatsApp socket for session ${customerId} is not initialized`);
    }

    this.logger.log(`Checking if number ${jid} exists on WhatsApp for customer: ${customerId}`);
    const [exists] = await sessionData.sock.onWhatsApp(jid);
    return exists;
  }

  /**
   * Retrieve session data by customerId from stored sessions folder
   * @param customerId - Customer ID to search for (folder name)
   * @returns {Promise<any | null>} - Session data or null if not found
   */
  public async getSessionByCustomerId(customerId: string): Promise<any | null> {
    this.logger.log(`Searching for session with customerId: ${customerId}`);
    
    try {
      // Check if base auth folder exists
      if (!fs.existsSync(this.baseAuthFolderPath)) {
        this.logger.warn(`Base auth folder ${this.baseAuthFolderPath} does not exist`);
        return null;
      }

      // Build the path to the customer's folder
      const customerFolderPath = path.join(this.baseAuthFolderPath, customerId);
      
      // Check if customer folder exists
      if (!fs.existsSync(customerFolderPath)) {
        this.logger.warn(`Customer folder ${customerId} does not exist`);
        return null;
      }

      // Read all files in the customer folder
      const files = fs.readdirSync(customerFolderPath);
      
      // Look for session files (any file containing session data)
      const sessionFiles = files.filter(file => {
        // Look for files that might contain session data
        return file.includes('session') || file === 'creds.json';
      });

      if (sessionFiles.length === 0) {
        this.logger.warn(`No session files found in customer folder: ${customerId}`);
        return null;
      }

      // Try to read session data from the files
      let sessionData: any | null = null;
      let foundFile: string | null = null;

      for (const file of sessionFiles) {
        try {
          const filePath = path.join(customerFolderPath, file);
          const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Check if this file contains session data
          if (fileContent && (fileContent._sessions || fileContent.me || fileContent.creds)) {
            sessionData = fileContent;
            foundFile = file;
            break;
          }
        } catch (error) {
          this.logger.warn(`Error reading file ${file}:`, error.message);
          continue;
        }
      }

      if (!sessionData) {
        this.logger.warn(`No valid session data found in customer folder: ${customerId}`);
        return null;
      }

      this.logger.log(`✅ Found session for customerId ${customerId} in file: ${foundFile}`);
      
      return {
        customerId,
        fileName: foundFile!,
        filePath: path.join(customerFolderPath, foundFile!),
        sessionData,
        exists: true
      };

    } catch (error) {
      this.logger.error(`❌ Error retrieving session for customerId ${customerId}:`, error);
      return null;
    }
  }
}
