import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FraudDetectorService, SessionScores } from './fraud-detector.service';

@Injectable()
export class AnticorrupcionService {
  private readonly logger = new Logger(AnticorrupcionService.name);

  constructor(
    private prisma: PrismaService,
    private fraudDetector: FraudDetectorService,
  ) {}

  /**
   * Evalúa una sesión completa
   */
  async evaluateSession(sessionId: string, scores: SessionScores) {
    return this.fraudDetector.evaluateSession(sessionId, scores);
  }

  /**
   * Obtiene alertas pendientes
   */
  async getPendingAlerts(limit = 50) {
    return this.prisma.fraudAlert.findMany({
      where: { isResolved: false },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        session: {
          include: {
            terminal: true,
            patient: true,
          },
        },
      },
    });
  }

  /**
   * Resuelve una alerta
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution: string) {
    return this.prisma.fraudAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });
  }

  /**
   * Obtiene estadísticas de fraude
   */
  async getStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, resolved, bySeverity, byType] = await Promise.all([
      this.prisma.fraudAlert.count({ where }),
      this.prisma.fraudAlert.count({ where: { ...where, isResolved: true } }),
      this.prisma.fraudAlert.groupBy({
        by: ['severity'],
        _count: { severity: true },
        where,
      }),
      this.prisma.fraudAlert.groupBy({
        by: ['type'],
        _count: { type: true },
        where,
      }),
    ]);

    return {
      total,
      resolved,
      pending: total - resolved,
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count.severity })),
      byType: byType.map(t => ({ type: t.type, count: t._count.type })),
    };
  }
}
