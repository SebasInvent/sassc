import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Umbrales de detección de fraude
const THRESHOLDS = {
  FACE_MATCH_MIN: 0.70,
  LIVENESS_MIN: 0.35,
  FINGERPRINT_MIN: 0.80,
  CEDULA_MATCH_MIN: 0.65,
  RISK_SCORE_ALERT: 0.60,
  RISK_SCORE_BLOCK: 0.85,
};

export interface SessionScores {
  faceMatchScore?: number;
  livenessScore?: number;
  fingerprintScore?: number;
  cedulaMatchScore?: number;
}

export interface FraudAlert {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: Record<string, any>;
}

export interface FraudCheckResult {
  hasFraud: boolean;
  alerts: FraudAlert[];
  overallRiskScore: number;
  recommendation: 'ALLOW' | 'ALERT' | 'BLOCK' | 'REDIRECT';
}

@Injectable()
export class FraudDetectorService {
  private readonly logger = new Logger(FraudDetectorService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Evalúa una sesión completa para detectar fraude
   */
  async evaluateSession(sessionId: string, scores: SessionScores): Promise<FraudCheckResult> {
    this.logger.log(`Evaluating session ${sessionId} for fraud`);

    const alerts: FraudAlert[] = [];
    let riskScore = 0;

    // 1. Verificar liveness
    if (scores.livenessScore !== undefined && scores.livenessScore < THRESHOLDS.LIVENESS_MIN) {
      alerts.push({
        type: 'LIVENESS_FAILED',
        severity: 'CRITICAL',
        description: 'Fallo en detección de vida. Posible spoofing o deepfake.',
        evidence: { livenessScore: scores.livenessScore, threshold: THRESHOLDS.LIVENESS_MIN },
      });
      riskScore += 0.4;
    }

    // 2. Verificar match de rostro
    if (scores.faceMatchScore !== undefined && scores.faceMatchScore < THRESHOLDS.FACE_MATCH_MIN) {
      alerts.push({
        type: 'IDENTITY_SPOOFING',
        severity: 'HIGH',
        description: 'El rostro no coincide con los registros del sistema.',
        evidence: { faceMatchScore: scores.faceMatchScore, threshold: THRESHOLDS.FACE_MATCH_MIN },
      });
      riskScore += 0.3;
    }

    // 3. Verificar match de cédula
    if (scores.cedulaMatchScore !== undefined && scores.cedulaMatchScore < THRESHOLDS.CEDULA_MATCH_MIN) {
      alerts.push({
        type: 'FACE_CEDULA_MISMATCH',
        severity: 'HIGH',
        description: 'El rostro no coincide con la foto de la cédula.',
        evidence: { cedulaMatchScore: scores.cedulaMatchScore, threshold: THRESHOLDS.CEDULA_MATCH_MIN },
      });
      riskScore += 0.35;
    }

    // 4. Verificar huella
    if (scores.fingerprintScore !== undefined && scores.fingerprintScore < THRESHOLDS.FINGERPRINT_MIN) {
      alerts.push({
        type: 'FINGERPRINT_MISMATCH',
        severity: 'MEDIUM',
        description: 'La huella dactilar no coincide con el registro.',
        evidence: { fingerprintScore: scores.fingerprintScore, threshold: THRESHOLDS.FINGERPRINT_MIN },
      });
      riskScore += 0.25;
    }

    // Normalizar risk score
    riskScore = Math.min(1, riskScore);

    // Determinar recomendación
    let recommendation: 'ALLOW' | 'ALERT' | 'BLOCK' | 'REDIRECT';
    if (riskScore >= THRESHOLDS.RISK_SCORE_BLOCK) {
      recommendation = 'BLOCK';
    } else if (riskScore >= THRESHOLDS.RISK_SCORE_ALERT) {
      recommendation = 'ALERT';
    } else if (alerts.length > 0) {
      recommendation = 'REDIRECT';
    } else {
      recommendation = 'ALLOW';
    }

    // Guardar alertas en la base de datos
    for (const alert of alerts) {
      await this.prisma.fraudAlert.create({
        data: {
          sessionId,
          type: alert.type as any,
          severity: alert.severity as any,
          description: alert.description,
          evidence: alert.evidence,
          scores: scores as any,
        },
      });
    }

    // Actualizar sesión con risk score
    await this.prisma.biometricSession.update({
      where: { id: sessionId },
      data: {
        overallRiskScore: riskScore,
        status: recommendation === 'BLOCK' ? 'FRAUD_DETECTED' : undefined,
      },
    });

    await this.auditService.log({
      sessionId,
      action: 'FRAUD_EVALUATION',
      resource: 'anticorrupcion-engine',
      outcome: alerts.length > 0 ? 'FAILURE' : 'SUCCESS',
      details: {
        alertCount: alerts.length,
        riskScore,
        recommendation,
        alertTypes: alerts.map(a => a.type),
      },
    });

    return {
      hasFraud: alerts.length > 0,
      alerts,
      overallRiskScore: riskScore,
      recommendation,
    };
  }

  /**
   * Verifica si hay intentos de registro duplicado
   */
  async checkDuplicateRegistration(sessionId: string): Promise<{
    isDuplicate: boolean;
    evidence: Record<string, any>;
  }> {
    // Buscar huellas duplicadas en la sesión
    const session = await this.prisma.biometricSession.findUnique({
      where: { id: sessionId },
      include: { biometricData: true },
    });

    if (!session) {
      return { isDuplicate: false, evidence: {} };
    }

    const fingerprintData = session.biometricData.find(
      (d) => d.type === 'FINGERPRINT' && d.templateHash,
    );

    if (fingerprintData?.templateHash) {
      const existing = await this.prisma.fingerprintData.findFirst({
        where: {
          templateHash: fingerprintData.templateHash,
          sessionId: { not: sessionId },
        },
      });

      if (existing) {
        return {
          isDuplicate: true,
          evidence: {
            type: 'FINGERPRINT_DUPLICATE',
            existingPatientId: existing.patientId,
          },
        };
      }
    }

    return { isDuplicate: false, evidence: {} };
  }

  /**
   * Detecta posible servicio fantasma
   */
  async detectPhantomService(
    patientId: string,
    serviceType: string,
    ipsId: string,
  ): Promise<{ isPhantom: boolean; reason?: string }> {
    // Verificar si el paciente tiene sesión biométrica reciente en esa IPS
    const recentSession = await this.prisma.biometricSession.findFirst({
      where: {
        patientId,
        terminal: { ipsId },
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
        },
      },
    });

    if (!recentSession) {
      return {
        isPhantom: true,
        reason: 'No hay registro biométrico del paciente en la IPS en las últimas 24 horas',
      };
    }

    return { isPhantom: false };
  }
}
