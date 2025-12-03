import { Injectable, Logger } from '@nestjs/common';
import { SerialPort } from 'serialport';

@Injectable()
export class FingerprintReaderService {
  private readonly logger = new Logger(FingerprintReaderService.name);
  private port: SerialPort | null = null;
  private isConnected = false;
  private lastFingerprint: string | null = null;

  constructor() {
    this.initializeReader();
  }

  private async initializeReader() {
    try {
      // Buscar puertos disponibles
      const ports = await SerialPort.list();
      this.logger.log('Puertos disponibles:', ports.map(p => `${p.path} - ${p.manufacturer || 'Unknown'}`));
      
      // Buscar el lector Morpho MSO1300 (VendorId 225D)
      const fingerprintPort = ports.find(p => 
        p.vendorId === '225D' || // Morpho/Idemia
        p.path === 'COM8' // Fallback a COM8
      );

      if (fingerprintPort) {
        this.logger.log(`🔍 Intentando conectar a lector de huellas en ${fingerprintPort.path}`);
        await this.connect(fingerprintPort.path);
      } else {
        this.logger.warn('⚠️ No se encontró lector de huellas. Puertos disponibles:', ports.map(p => p.path));
      }
    } catch (error) {
      this.logger.error('Error inicializando lector de huellas:', error);
    }
  }

  private async connect(portPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.port = new SerialPort({
          path: portPath,
          baudRate: 115200, // Morpho MSO1300 usa 115200
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
        });

        this.port.on('open', () => {
          this.isConnected = true;
          this.logger.log(`✅ Lector de huellas conectado en ${portPath}`);
          resolve(true);
        });

        this.port.on('data', (data: Buffer) => {
          this.handleData(data);
        });

        this.port.on('error', (err) => {
          this.logger.error('Error en puerto serial:', err.message);
          this.isConnected = false;
          resolve(false);
        });

        this.port.on('close', () => {
          this.isConnected = false;
          this.logger.warn('Puerto serial cerrado');
        });

      } catch (error) {
        this.logger.error('Error conectando:', error);
        resolve(false);
      }
    });
  }

  private handleData(data: Buffer) {
    // Los huelleros genéricos suelen enviar datos en formato específico
    // Aquí procesamos la respuesta
    this.logger.log(`📥 Datos recibidos: ${data.toString('hex')}`);
    
    // Guardar como template de huella (en hex)
    if (data.length > 10) {
      this.lastFingerprint = data.toString('base64');
      this.logger.log('✅ Huella capturada');
    }
  }

  async getStatus() {
    const ports = await SerialPort.list();
    return {
      connected: this.isConnected,
      port: this.port?.path || null,
      availablePorts: ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        vendorId: p.vendorId,
        productId: p.productId,
      })),
    };
  }

  async listDevices(): Promise<Array<{ path: string; manufacturer?: string; vendorId?: string; productId?: string }>> {
    const ports = await SerialPort.list();
    return ports
      .filter(p => p.path !== 'COM7')
      .map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        vendorId: p.vendorId,
        productId: p.productId,
      }));
  }

  async capture(): Promise<{ success: boolean; fingerprint?: string; error?: string }> {
    if (!this.isConnected || !this.port) {
      return { success: false, error: 'Lector no conectado' };
    }

    return new Promise((resolve) => {
      this.lastFingerprint = null;

      // Comandos para Morpho MSO1300
      // Protocolo ILV (Identifier-Length-Value)
      // Comando de captura: enviar solicitud y esperar respuesta
      
      // Intentar varios comandos comunes
      const commands = [
        // Comando GetImage para Morpho
        Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00]),
        // Comando alternativo
        Buffer.from([0x40, 0x00, 0x00, 0x00]),
        // Comando de status
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
      ];
      
      const captureCommand = commands[0];
      
      this.port.write(captureCommand, (err) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        // Esperar respuesta (máximo 5 segundos)
        const timeout = setTimeout(() => {
          if (this.lastFingerprint) {
            resolve({ success: true, fingerprint: this.lastFingerprint });
          } else {
            resolve({ success: false, error: 'Timeout esperando huella' });
          }
        }, 5000);

        // Si recibimos datos antes del timeout
        const checkInterval = setInterval(() => {
          if (this.lastFingerprint) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve({ success: true, fingerprint: this.lastFingerprint });
          }
        }, 100);
      });
    });
  }
}
