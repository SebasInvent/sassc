import { Controller, Post, Body, Param } from '@nestjs/common';
import { FingerprintService } from './fingerprint.service';

@Controller('biometrics/v2/fingerprint')
export class FingerprintController {
  constructor(private readonly fingerprintService: FingerprintService) {}

  @Post('capture/:patientId')
  async capture(
    @Param('patientId') patientId: string,
    @Body() body: {
      finger: string;
      templateISO: string;
      quality: number;
      sessionId: string;
    },
  ) {
    return this.fingerprintService.capture(
      patientId,
      body.finger,
      body.templateISO,
      body.quality,
      body.sessionId,
    );
  }

  @Post('verify/:patientId')
  async verify(
    @Param('patientId') patientId: string,
    @Body() body: {
      finger: string;
      templateISO: string;
      sessionId: string;
    },
  ) {
    return this.fingerprintService.verify(
      patientId,
      body.finger,
      body.templateISO,
      body.sessionId,
    );
  }

  @Post('search')
  async search(
    @Body() body: { templateISO: string; sessionId: string },
  ) {
    return this.fingerprintService.search(body.templateISO, body.sessionId);
  }
}
