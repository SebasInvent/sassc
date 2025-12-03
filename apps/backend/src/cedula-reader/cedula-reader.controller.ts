import { Controller, Get, Post } from '@nestjs/common';
import { CedulaReaderService } from './cedula-reader.service';

@Controller('cedula-reader')
export class CedulaReaderController {
  constructor(private readonly cedulaReaderService: CedulaReaderService) {}

  @Get('read')
  read() {
    const data = this.cedulaReaderService.getLastRead();
    
    if (!data) {
      return { success: false, message: 'No hay lectura disponible' };
    }
    
    // Limpiar después de leer para evitar duplicados
    this.cedulaReaderService.clearLastRead();
    
    return {
      success: true,
      data,
    };
  }

  @Get('status')
  status() {
    return {
      connected: this.cedulaReaderService.isConnected(),
      port: 'COM7',
      baudRate: 115200,
    };
  }

  @Post('clear')
  clear() {
    this.cedulaReaderService.clearLastRead();
    return { success: true };
  }
}
