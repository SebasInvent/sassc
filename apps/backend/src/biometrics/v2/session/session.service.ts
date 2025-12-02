import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionStatus, RoutingDestination } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface CreateSessionDto {
  terminalId: string;
  patientId?: string;
  capturedData?: Record<string, any>;
}

export interface UpdateSessionDto {
  status?: SessionStatus;
  patientId?: string;
  capturedData?: Record<string, any>;
  faceMatchScore?: number;
  livenessScore?: number;
  fingerprintScore?: number;
  cedulaMatchScore?: number;
  overallRiskScore?: number;
  routingDecision?: RoutingDestination;
  routingReason?: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crea una nueva sesión biométrica
   */
  async create(dto: CreateSessionDto) {
    const sessionCode = uuidv4();
    
    this.logger.log(`Creating biometric session ${sessionCode} for terminal ${dto.terminalId}`);

    const session = await this.prisma.biometricSession.create({
      data: {
        sessionCode,
        terminalId: dto.terminalId,
        patientId: dto.patientId,
        capturedData: dto.capturedData,
        status: 'INITIATED',
      },
      include: {
        terminal: true,
      },
    });

    return session;
  }

  /**
   * Obtiene una sesión por ID
   */
  async findById(id: string) {
    const session = await this.prisma.biometricSession.findUnique({
      where: { id },
      include: {
        terminal: true,
        patient: true,
        biometricData: true,
        cedulaScans: true,
        fraudAlerts: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }

    return session;
  }

  /**
   * Obtiene una sesión por código
   */
  async findByCode(sessionCode: string) {
    const session = await this.prisma.biometricSession.findUnique({
      where: { sessionCode },
      include: {
        terminal: true,
        patient: true,
        biometricData: true,
        cedulaScans: true,
        fraudAlerts: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with code ${sessionCode} not found`);
    }

    return session;
  }

  /**
   * Actualiza una sesión
   */
  async update(id: string, dto: UpdateSessionDto) {
    this.logger.log(`Updating session ${id}`);

    const session = await this.prisma.biometricSession.update({
      where: { id },
      data: {
        ...dto,
        completedAt: dto.status === 'COMPLETED' || dto.status === 'FAILED' || dto.status === 'FRAUD_DETECTED'
          ? new Date()
          : undefined,
      },
      include: {
        terminal: true,
        patient: true,
      },
    });

    return session;
  }

  /**
   * Marca una sesión como completada
   */
  async complete(id: string, routingDecision: RoutingDestination, routingReason: string) {
    return this.update(id, {
      status: 'COMPLETED',
      routingDecision,
      routingReason,
    });
  }

  /**
   * Marca una sesión como fallida
   */
  async fail(id: string, reason: string) {
    return this.update(id, {
      status: 'FAILED',
      routingReason: reason,
    });
  }

  /**
   * Marca una sesión como fraude detectado
   */
  async markFraud(id: string, reason: string) {
    return this.update(id, {
      status: 'FRAUD_DETECTED',
      routingDecision: 'AUDIT_OFFICE',
      routingReason: reason,
    });
  }

  /**
   * Lista sesiones por terminal
   */
  async findByTerminal(terminalId: string, limit = 50) {
    return this.prisma.biometricSession.findMany({
      where: { terminalId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, docNumber: true },
        },
        fraudAlerts: {
          where: { isResolved: false },
        },
      },
    });
  }

  /**
   * Lista sesiones con alertas de fraude pendientes
   */
  async findWithPendingAlerts() {
    return this.prisma.biometricSession.findMany({
      where: {
        fraudAlerts: {
          some: { isResolved: false },
        },
      },
      orderBy: { startedAt: 'desc' },
      include: {
        terminal: true,
        patient: true,
        fraudAlerts: {
          where: { isResolved: false },
        },
      },
    });
  }

  /**
   * Estadísticas de sesiones
   */
  async getStats(terminalId?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (terminalId) {
      where.terminalId = terminalId;
    }
    
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = startDate;
      if (endDate) where.startedAt.lte = endDate;
    }

    const [total, completed, failed, fraudDetected] = await Promise.all([
      this.prisma.biometricSession.count({ where }),
      this.prisma.biometricSession.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.biometricSession.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.biometricSession.count({ where: { ...where, status: 'FRAUD_DETECTED' } }),
    ]);

    return {
      total,
      completed,
      failed,
      fraudDetected,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      fraudRate: total > 0 ? (fraudDetected / total) * 100 : 0,
    };
  }
}
