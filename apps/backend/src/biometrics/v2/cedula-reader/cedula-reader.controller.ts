import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { CedulaReaderService, CedulaScanData } from './cedula-reader.service';

@Controller('biometrics/v2/cedula')
export class CedulaReaderController {
  constructor(private readonly cedulaReaderService: CedulaReaderService) {}

  @Post('scan')
  async processScan(
    @Body() body: { sessionId: string; data: CedulaScanData },
  ) {
    return this.cedulaReaderService.processScan(body.sessionId, body.data);
  }

  @Post('face-match/:scanId')
  async updateFaceMatch(
    @Param('scanId') scanId: string,
    @Body() body: { faceMatchScore: number; sessionId: string },
  ) {
    return this.cedulaReaderService.updateFaceMatch(
      scanId,
      body.faceMatchScore,
      body.sessionId,
    );
  }

  @Get('patient/:documentNumber')
  async findPatient(@Param('documentNumber') documentNumber: string) {
    return this.cedulaReaderService.findPatientByDocument(documentNumber);
  }
}
