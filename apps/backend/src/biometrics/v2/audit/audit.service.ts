import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface AuditLogDto {
  sessionId?: string;
  terminalId?: string;
  userId?: string;
  patientId?: string;
  action: string;
  resource: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'ERROR';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private lastEventHash: string | null = null;

  constructor(private prisma: PrismaService) {}

  /**
   * Registra un evento de auditoría con hash encadenado (tipo blockchain)
   */
  async log(dto: AuditLogDto) {
    // Crear hash del evento actual
    const eventData = JSON.stringify({
      ...dto,
      timestamp: new Date().toISOString(),
      previousHash: this.lastEventHash,
    });
    
    const eventHash = crypto
      .createHash('sha256')
      .update(eventData)
      .digest('hex');

    // Crear firma digital (simplificada - en producción usar PKI)
    const signature = crypto
      .createHash('sha256')
      .update(eventHash + process.env.JWT_SECRET)
      .digest('hex');

    const event = await this.prisma.biometricAuditEvent.create({
      data: {
        sessionId: dto.sessionId,
        terminalId: dto.terminalId,
        userId: dto.userId,
        patientId: dto.patientId,
        action: dto.action,
        resource: dto.resource,
        outcome: dto.outcome,
        details: dto.details,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        latitude: dto.latitude,
        longitude: dto.longitude,
        eventHash,
        previousHash: this.lastEventHash,
        signature,
      },
    });

    // Actualizar último hash para la cadena
    this.lastEventHash = eventHash;

    this.logger.debug(`Audit event logged: ${dto.action} on ${dto.resource} - ${dto.outcome}`);

    return event;
  }

  /**
   * Obtiene eventos de auditoría por sesión
   */
  async findBySession(sessionId: string) {
    return this.prisma.biometricAuditEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Obtiene eventos de auditoría por terminal
   */
  async findByTerminal(terminalId: string, limit = 100) {
    return this.prisma.biometricAuditEvent.findMany({
      where: { terminalId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Verifica la integridad de la cadena de auditoría
   */
  async verifyChainIntegrity(startId?: string, endId?: string): Promise<{
    isValid: boolean;
    totalEvents: number;
    invalidEvents: string[];
  }> {
    const events = await this.prisma.biometricAuditEvent.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const invalidEvents: string[] = [];
    let previousHash: string | null = null;

    for (const event of events) {
      // Verificar que el previousHash coincida
      if (event.previousHash !== previousHash) {
        invalidEvents.push(event.id);
      }
      previousHash = event.eventHash;
    }

    return {
      isValid: invalidEvents.length === 0,
      totalEvents: events.length,
      invalidEvents,
    };
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, success, failure, error] = await Promise.all([
      this.prisma.biometricAuditEvent.count({ where }),
      this.prisma.biometricAuditEvent.count({ where: { ...where, outcome: 'SUCCESS' } }),
      this.prisma.biometricAuditEvent.count({ where: { ...where, outcome: 'FAILURE' } }),
      this.prisma.biometricAuditEvent.count({ where: { ...where, outcome: 'ERROR' } }),
    ]);

    // Agrupar por acción
    const byAction = await this.prisma.biometricAuditEvent.groupBy({
      by: ['action'],
      _count: { action: true },
      where,
    });

    return {
      total,
      success,
      failure,
      error,
      byAction: byAction.map(a => ({ action: a.action, count: a._count.action })),
    };
  }
}
