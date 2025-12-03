import { Controller, Get, Post } from '@nestjs/common';
import { FingerprintReaderService } from './fingerprint-reader.service';

@Controller('fingerprint')
export class FingerprintReaderController {
  constructor(private readonly fingerprintService: FingerprintReaderService) {}

  @Get('status')
  async getStatus() {
    return this.fingerprintService.getStatus();
  }

  @Post('capture')
  async captureFingerprint() {
    return this.fingerprintService.capture();
  }

  @Get('devices')
  async listDevices() {
    return this.fingerprintService.listDevices();
  }
}
