import { Controller, Post, Body, Param } from '@nestjs/common';
import { FaceInsightService } from './face-insight.service';

@Controller('biometrics/v2/face')
export class FaceInsightController {
  constructor(private readonly faceInsightService: FaceInsightService) {}

  @Post('extract-512d')
  async extractEmbedding(
    @Body() body: { imageBase64: string; sessionId: string },
  ) {
    return this.faceInsightService.extractEmbedding(body.imageBase64, body.sessionId);
  }

  @Post('liveness')
  async checkLiveness(
    @Body() body: { imageBase64: string; sessionId: string },
  ) {
    return this.faceInsightService.checkLiveness(body.imageBase64, body.sessionId);
  }

  @Post('match-cedula')
  async matchWithCedula(
    @Body() body: { faceEmbedding: number[]; cedulaPhotoBase64: string; sessionId: string },
  ) {
    return this.faceInsightService.matchWithCedulaPhoto(
      body.faceEmbedding,
      body.cedulaPhotoBase64,
      body.sessionId,
    );
  }

  @Post('search')
  async searchDatabase(
    @Body() body: { embedding: number[]; sessionId: string },
  ) {
    return this.faceInsightService.findMatchInDatabase(body.embedding, body.sessionId);
  }

  @Post('save/:patientId')
  async saveEmbedding(
    @Param('patientId') patientId: string,
    @Body() body: {
      embedding: number[];
      quality: number;
      livenessScore?: number;
      captureAngle?: string;
      imageHash?: string;
      sessionId: string;
    },
  ) {
    await this.faceInsightService.saveEmbedding(
      patientId,
      body.embedding,
      {
        quality: body.quality,
        livenessScore: body.livenessScore,
        captureAngle: body.captureAngle,
        imageHash: body.imageHash,
      },
      body.sessionId,
    );
    return { success: true };
  }
}
