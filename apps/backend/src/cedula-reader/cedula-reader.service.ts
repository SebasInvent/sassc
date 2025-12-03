import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SerialPort } = require('serialport');

export interface CedulaData {
  cedula: string;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  genero: string;
  fechaNacimiento: string;
  fechaExpedicion: string;
  rh: string;
  raw?: string;
}

@Injectable()
export class CedulaReaderService implements OnModuleInit, OnModuleDestroy {
  private port: any = null;
  private lastRead: CedulaData | null = null;
  private lastReadTime: number = 0;
  private buffer: Buffer = Buffer.alloc(0);

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      this.port = new SerialPort({
        path: 'COM7',
        baudRate: 115200,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      });

      this.port.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.port.on('error', (err) => {
        console.error('Serial port error:', err);
      });

      console.log('✅ Lector de cédula conectado en COM7');
    } catch (error) {
      console.error('❌ Error conectando lector de cédula:', error);
    }
  }

  private async disconnect() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
  }

  private handleData(data: Buffer) {
    // Acumular datos en buffer
    this.buffer = Buffer.concat([this.buffer, data]);
    
    // Si tenemos suficientes datos, parsear
    if (this.buffer.length >= 200) {
      const parsed = this.parseBuffer(this.buffer);
      if (parsed) {
        this.lastRead = parsed;
        this.lastReadTime = Date.now();
        console.log('📋 Cédula leída:', parsed.cedula, parsed.nombre1, parsed.apellido1);
      }
      // Limpiar buffer
      this.buffer = Buffer.alloc(0);
    }
  }

  private parseBuffer(buffer: Buffer): CedulaData | null {
    try {
      // Convertir a string, reemplazando bytes nulos por separadores
      const raw = buffer.toString('ascii');
      
      // Buscar patrones en los datos
      // Estructura detectada:
      // [codigo_interno][PubDSK_1][codigo2][CEDULA][APELLIDO1][APELLIDO2][NOMBRE1][NOMBRE2][0M][FECHA_NAC][FECHA_EXP][RH]
      
      // Extraer campos separados por bytes nulos
      const parts: string[] = [];
      let current = '';
      
      for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        if (byte === 0) {
          if (current.length > 0) {
            parts.push(current);
            current = '';
          }
        } else if (byte >= 32 && byte < 127) {
          current += String.fromCharCode(byte);
        }
      }
      if (current.length > 0) {
        parts.push(current);
      }

      // Buscar la cédula (10 dígitos que empiezan con 10)
      let cedulaIndex = -1;
      for (let i = 0; i < parts.length; i++) {
        if (/^10\d{8}$/.test(parts[i])) {
          cedulaIndex = i;
          break;
        }
      }

      if (cedulaIndex === -1) {
        // Buscar cualquier número de 10 dígitos
        for (let i = 0; i < parts.length; i++) {
          if (/^\d{10}$/.test(parts[i])) {
            cedulaIndex = i;
            break;
          }
        }
      }

      if (cedulaIndex === -1) return null;

      // Extraer datos basados en la posición de la cédula
      const cedula = parts[cedulaIndex];
      const apellido1 = parts[cedulaIndex + 1] || '';
      const apellido2 = parts[cedulaIndex + 2] || '';
      const nombre1 = parts[cedulaIndex + 3] || '';
      const nombre2 = parts[cedulaIndex + 4] || '';
      
      // El siguiente campo tiene género y fecha
      const generoFecha = parts[cedulaIndex + 5] || '';
      const genero = generoFecha.includes('M') ? 'M' : generoFecha.includes('F') ? 'F' : '';
      
      // Extraer fecha de nacimiento (formato YYYYMMDD)
      const fechaMatch = generoFecha.match(/(\d{8})/);
      let fechaNacimiento = '';
      if (fechaMatch) {
        const f = fechaMatch[1];
        fechaNacimiento = `${f.substring(0, 4)}-${f.substring(4, 6)}-${f.substring(6, 8)}`;
      }
      
      // Fecha de expedición
      const expMatch = parts[cedulaIndex + 6]?.match(/(\d{6})/);
      let fechaExpedicion = '';
      if (expMatch) {
        const e = expMatch[1];
        fechaExpedicion = `20${e.substring(4, 6)}-${e.substring(2, 4)}-${e.substring(0, 2)}`;
      }
      
      // RH
      const rhMatch = generoFecha.match(/([ABO][\+\-])/);
      const rh = rhMatch ? rhMatch[1] : '';

      return {
        cedula,
        apellido1,
        apellido2,
        nombre1,
        nombre2,
        genero,
        fechaNacimiento,
        fechaExpedicion,
        rh,
        raw: parts.join(' | '),
      };
    } catch (error) {
      console.error('Error parsing cedula data:', error);
      return null;
    }
  }

  // Obtener última lectura (válida por 10 segundos)
  getLastRead(): CedulaData | null {
    if (!this.lastRead) return null;
    
    // La lectura es válida por 10 segundos
    if (Date.now() - this.lastReadTime > 10000) {
      this.lastRead = null;
      return null;
    }
    
    return this.lastRead;
  }

  // Limpiar última lectura (después de usarla)
  clearLastRead() {
    this.lastRead = null;
  }

  // Verificar si el lector está conectado
  isConnected(): boolean {
    return this.port !== null && this.port.isOpen;
  }
}
