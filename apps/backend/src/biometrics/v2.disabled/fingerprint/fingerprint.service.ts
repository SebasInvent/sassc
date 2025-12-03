import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class FingerprintService {
  private readonly logger = new Logger(FingerprintService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Captura y guarda huella dactilar
   */
  async capture(
    patientId: string,
    finger: string,
    templateISO: string,
    quality: number,
    sessionId: string,
  ) {
    const templateHash = crypto.createHash('sha256').update(templateISO).digest('hex');

    // Verificar duplicados
    const existing = await this.prisma.fingerprintData.findFirst({
      where: { templateHash, patientId: { not: patientId } },
    });

    if (existing) {
      await this.auditService.log({
        sessionId,
        patientId,
        action: 'FINGERPRINT_DUPLICATE_DETECTED',
        resource: 'fingerprint',
        outcome: 'FAILURE',
        details: { finger, existingPatientId: existing.patientId },
      });

      return {
        success: false,
        error: 'DUPLICATE_FINGERPRINT',
        existingPatientId: existing.patientId,
      };
    }

    // Guardar huella
    await this.prisma.fingerprintData.upsert({
      where: { patientId_finger: { patientId, finger: finger as any } },
      create: {
        patientId,
        finger: finger as any,
        templateISO,
        templateHash,
        quality,
        sessionId,
        isVerified: true,
      },
      update: {
        templateISO,
        templateHash,
        quality,
        sessionId,
      },
    });

    await this.auditService.log({
      sessionId,
      patientId,
      action: 'FINGERPRINT_CAPTURED',
      resource: 'fingerprint',
      outcome: 'SUCCESS',
      details: { finger, quality },
    });

    return { success: true, templateHash };
  }

  /**
   * Verifica huella contra registro existente
   */
  async verify(
    patientId: string,
    finger: string,
    templateISO: string,
    sessionId: string,
  ) {
    const stored = await this.prisma.fingerprintData.findUnique({
      where: { patientId_finger: { patientId, finger: finger as any } },
    });

    if (!stored) {
      return { success: false, error: 'NO_FINGERPRINT_REGISTERED' };
    }

    // En producción, usar algoritmo de matching ISO 19794
    // Por ahora, comparar hashes (simplificado)
    const templateHash = crypto.createHash('sha256').update(templateISO).digest('hex');
    const isMatch = stored.templateHash === templateHash;

    await this.auditService.log({
      sessionId,
      patientId,
      action: 'FINGERPRINT_VERIFY',
      resource: 'fingerprint',
      outcome: isMatch ? 'SUCCESS' : 'FAILURE',
      details: { finger, isMatch },
    });

    return {
      success: isMatch,
      score: isMatch ? 1.0 : 0.0,
    };
  }

  /**
   * Busca huella en toda la base de datos
   */
  async search(templateISO: string, sessionId: string) {
    const templateHash = crypto.createHash('sha256').update(templateISO).digest('hex');

    const match = await this.prisma.fingerprintData.findFirst({
      where: { templateHash },
      include: { patient: true },
    });

    await this.auditService.log({
      sessionId,
      action: 'FINGERPRINT_SEARCH',
      resource: 'fingerprint',
      outcome: match ? 'SUCCESS' : 'FAILURE',
      details: { found: !!match, patientId: match?.patientId },
    });

    return match;
  }
}
