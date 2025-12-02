import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type RoutingDestination = 
  | 'TRIAGE' | 'CONSULTATION' | 'LABORATORY' | 'PHARMACY' 
  | 'IMAGING' | 'EMERGENCY' | 'AUDIT_OFFICE' | 'DOCUMENT_WINDOW' 
  | 'WAITING_ROOM' | 'SPECIALIST';

export interface RoutingContext {
  sessionId: string;
  terminalId: string;
  terminalType: string;
  patientId?: string;
  epsCode?: string;
  serviceRequested?: string;
  riskScore: number;
  hasAlerts: boolean;
  alertSeverities: string[];
}

export interface RoutingDecision {
  destination: RoutingDestination;
  reason: string;
  priority: 'NORMAL' | 'PRIORITY' | 'URGENT';
  instructions: string;
  additionalData?: Record<string, any>;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Determina el destino del paciente basado en contexto
   */
  async determineRouting(context: RoutingContext): Promise<RoutingDecision> {
    this.logger.log(`Determining routing for session ${context.sessionId}`);

    // 1. Verificar alertas críticas → Auditoría
    if (context.alertSeverities.includes('CRITICAL')) {
      return this.createDecision(
        'AUDIT_OFFICE',
        'Alerta crítica de seguridad detectada',
        'URGENT',
        context.sessionId,
      );
    }

    // 2. Verificar riesgo alto → Ventanilla documental
    if (context.riskScore >= 0.8) {
      return this.createDecision(
        'DOCUMENT_WINDOW',
        'Riesgo biométrico alto - requiere verificación manual',
        'PRIORITY',
        context.sessionId,
      );
    }

    // 3. Routing por tipo de terminal
    const terminalRouting = this.getTerminalBasedRouting(context);
    if (terminalRouting) {
      return this.createDecision(
        terminalRouting.destination,
        terminalRouting.reason,
        'NORMAL',
        context.sessionId,
      );
    }

    // 4. Routing por servicio solicitado
    if (context.serviceRequested) {
      const serviceRouting = this.getServiceBasedRouting(context.serviceRequested);
      return this.createDecision(
        serviceRouting.destination,
        serviceRouting.reason,
        'NORMAL',
        context.sessionId,
      );
    }

    // 5. Default: Sala de espera
    return this.createDecision(
      'WAITING_ROOM',
      'Registro completado exitosamente',
      'NORMAL',
      context.sessionId,
    );
  }

  /**
   * Routing basado en tipo de terminal
   */
  private getTerminalBasedRouting(context: RoutingContext): { destination: RoutingDestination; reason: string } | null {
    const terminalRoutes: Record<string, { destination: RoutingDestination; reason: string }> = {
      'KIOSK_LAB': { destination: 'LABORATORY', reason: 'Terminal de laboratorio - dirigir a toma de muestras' },
      'KIOSK_PHARMACY': { destination: 'PHARMACY', reason: 'Terminal de farmacia - dirigir a dispensación' },
      'KIOSK_IMAGING': { destination: 'IMAGING', reason: 'Terminal de imágenes - dirigir a sala de espera de imágenes' },
    };

    return terminalRoutes[context.terminalType] || null;
  }

  /**
   * Routing basado en servicio solicitado
   */
  private getServiceBasedRouting(service: string): { destination: RoutingDestination; reason: string } {
    const serviceRoutes: Record<string, { destination: RoutingDestination; reason: string }> = {
      'CONSULTA_GENERAL': { destination: 'CONSULTATION', reason: 'Consulta médica general' },
      'CONSULTA_ESPECIALISTA': { destination: 'SPECIALIST', reason: 'Consulta con especialista' },
      'URGENCIAS': { destination: 'EMERGENCY', reason: 'Servicio de urgencias' },
      'LABORATORIO': { destination: 'LABORATORY', reason: 'Exámenes de laboratorio' },
      'FARMACIA': { destination: 'PHARMACY', reason: 'Dispensación de medicamentos' },
      'IMAGENES': { destination: 'IMAGING', reason: 'Imágenes diagnósticas' },
      'TRIAGE': { destination: 'TRIAGE', reason: 'Clasificación de urgencia' },
    };

    return serviceRoutes[service.toUpperCase()] || { destination: 'WAITING_ROOM', reason: 'Servicio general' };
  }

  /**
   * Crea y registra una decisión de routing
   */
  private async createDecision(
    destination: RoutingDestination,
    reason: string,
    priority: 'NORMAL' | 'PRIORITY' | 'URGENT',
    sessionId: string,
  ): Promise<RoutingDecision> {
    const instructions = this.getInstructions(destination);

    const decision: RoutingDecision = {
      destination,
      reason,
      priority,
      instructions,
    };

    // Actualizar sesión
    await this.prisma.biometricSession.update({
      where: { id: sessionId },
      data: {
        routingDecision: destination as any,
        routingReason: reason,
      },
    });

    // Registrar en auditoría
    await this.auditService.log({
      sessionId,
      action: 'ROUTING_DECISION',
      resource: 'routing-engine',
      outcome: 'SUCCESS',
      details: decision,
    });

    return decision;
  }

  /**
   * Obtiene instrucciones para el paciente
   */
  private getInstructions(destination: RoutingDestination): string {
    const instructions: Record<RoutingDestination, string> = {
      TRIAGE: 'Diríjase al área de triage para clasificación inicial.',
      CONSULTATION: 'Espere en la sala de consulta externa. Será llamado por su nombre.',
      LABORATORY: 'Diríjase al laboratorio clínico en el primer piso.',
      PHARMACY: 'Pase a la farmacia con su fórmula médica.',
      IMAGING: 'Diríjase a imágenes diagnósticas en el segundo piso.',
      EMERGENCY: 'Diríjase inmediatamente a urgencias.',
      AUDIT_OFFICE: 'Por favor espere, un funcionario lo atenderá.',
      DOCUMENT_WINDOW: 'Diríjase a la ventanilla de documentación.',
      WAITING_ROOM: 'Tome asiento en la sala de espera general.',
      SPECIALIST: 'Diríjase a consulta especializada en el tercer piso.',
    };

    return instructions[destination];
  }
}
