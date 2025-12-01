import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InsightFaceService } from './insightface.service';
import { LivenessService } from './liveness.service';
import { AntiSpoofService } from './antispoof.service';
import { CascadeService } from './cascade.service';
import { BiometricV2Controller } from './biometric.controller';

/**
 * Biometric V2 Module
 * 
 * InsightFace + Mediapipe biometric verification system
 */
@Module({
  controllers: [BiometricV2Controller],
  providers: [
    PrismaService,
    InsightFaceService,
    LivenessService,
    AntiSpoofService,
    CascadeService,
  ],
  exports: [
    InsightFaceService,
    LivenessService,
    AntiSpoofService,
    CascadeService,
  ],
})
export class BiometricV2Module {}
