import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LogAuditoria {
  id: string;
  tipo: string;
  accion: string;
  entidadTipo: string;
  entidadId: string;
  usuarioId?: string;
  usuarioNombre?: string;
  detalles?: any;
  ipAddress?: string;
  fecha: Date;
}

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // HISTORIAL DE FIRMAS BIOMÉTRICAS
  // ==========================================

  async getHistorialFirmas(filters?: {
    fechaDesde?: Date;
    fechaHasta?: Date;
    tipoAccion?: string;
    practitionerId?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.tipoAccion) where.tipoAccion = filters.tipoAccion;
    if (filters?.practitionerId) where.practitionerId = filters.practitionerId;

    if (filters?.fechaDesde || filters?.fechaHasta) {
      where.fechaFirma = {};
      if (filters.fechaDesde) where.fechaFirma.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaFirma.lte = filters.fechaHasta;
    }

    return this.prisma.firmaBiometrica.findMany({
      where,
      include: {
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            license: true,
            specialty: true,
          },
        },
      },
      orderBy: { fechaFirma: 'desc' },
      take: filters?.limit || 100,
    });
  }

  // ==========================================
  // HISTORIAL DE REMISIONES
  // ==========================================

  async getHistorialRemisiones(filters?: {
    fechaDesde?: Date;
    fechaHasta?: Date;
    estado?: string;
    capId?: string;
    ipsId?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.estado) where.estado = filters.estado;
    if (filters?.capId) where.capOrigenId = filters.capId;
    if (filters?.ipsId) where.ipsDestinoId = filters.ipsId;

    if (filters?.fechaDesde || filters?.fechaHasta) {
      where.createdAt = {};
      if (filters.fechaDesde) where.createdAt.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.createdAt.lte = filters.fechaHasta;
    }

    return this.prisma.remision.findMany({
      where,
      include: {
        capOrigen: { select: { nombre: true, ciudad: true } },
        ipsDestino: { select: { nombre: true, ciudad: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  // ==========================================
  // HISTORIAL DE PAGOS
  // ==========================================

  async getHistorialPagos(filters?: {
    fechaDesde?: Date;
    fechaHasta?: Date;
    estado?: string;
    ipsId?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.estado) where.estado = filters.estado;
    if (filters?.ipsId) where.ipsDestinoId = filters.ipsId;

    if (filters?.fechaDesde || filters?.fechaHasta) {
      where.fechaPago = {};
      if (filters.fechaDesde) where.fechaPago.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaPago.lte = filters.fechaHasta;
    }

    return this.prisma.pagoADRES.findMany({
      where,
      include: {
        adresRegional: { select: { nombre: true, departamento: true } },
        firmaBiometrica: {
          include: {
            practitioner: {
              select: { firstName: true, lastName: true, license: true },
            },
          },
        },
      },
      orderBy: { fechaPago: 'desc' },
      take: filters?.limit || 100,
    });
  }

  // ==========================================
  // HISTORIAL DE SEGUIMIENTOS PREVENTIVOS
  // ==========================================

  async getHistorialPreventivo(filters?: {
    fechaDesde?: Date;
    fechaHasta?: Date;
    estado?: string;
    programaId?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.estado) where.estado = filters.estado;
    if (filters?.programaId) where.programaId = filters.programaId;

    if (filters?.fechaDesde || filters?.fechaHasta) {
      where.fechaProgramada = {};
      if (filters.fechaDesde) where.fechaProgramada.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaProgramada.lte = filters.fechaHasta;
    }

    const seguimientos = await this.prisma.seguimientoPreventivo.findMany({
      where,
      include: {
        programa: { select: { nombre: true, tipo: true } },
      },
      orderBy: { fechaProgramada: 'desc' },
      take: filters?.limit || 100,
    });

    // Obtener info de pacientes
    const patientIds = [...new Set(seguimientos.map(s => s.patientId))];
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: { id: true, firstName: true, lastName: true, docNumber: true },
    });
    const patientsMap = new Map(patients.map(p => [p.id, p]));

    return seguimientos.map(s => ({
      ...s,
      patient: patientsMap.get(s.patientId),
    }));
  }

  // ==========================================
  // RESUMEN DE AUDITORÍA
  // ==========================================

  async getResumenAuditoria() {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - 7);

    const [
      firmasTotal,
      firmasMes,
      firmasSemana,
      remisionesTotal,
      remisionesMes,
      pagosTotal,
      pagosMes,
      seguimientosTotal,
      seguimientosMes,
    ] = await Promise.all([
      this.prisma.firmaBiometrica.count(),
      this.prisma.firmaBiometrica.count({ where: { fechaFirma: { gte: inicioMes } } }),
      this.prisma.firmaBiometrica.count({ where: { fechaFirma: { gte: inicioSemana } } }),
      this.prisma.remision.count(),
      this.prisma.remision.count({ where: { createdAt: { gte: inicioMes } } }),
      this.prisma.pagoADRES.count(),
      this.prisma.pagoADRES.count({ where: { createdAt: { gte: inicioMes } } }),
      this.prisma.seguimientoPreventivo.count(),
      this.prisma.seguimientoPreventivo.count({ where: { createdAt: { gte: inicioMes } } }),
    ]);

    // Top firmantes del mes
    const topFirmantes = await this.prisma.firmaBiometrica.groupBy({
      by: ['practitionerId'],
      where: { fechaFirma: { gte: inicioMes } },
      _count: true,
      orderBy: { _count: { practitionerId: 'desc' } },
      take: 5,
    });

    const practitionerIds = topFirmantes.map(t => t.practitionerId);
    const practitioners = await this.prisma.practitioner.findMany({
      where: { id: { in: practitionerIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const practitionersMap = new Map(practitioners.map(p => [p.id, p]));

    return {
      firmas: { total: firmasTotal, mes: firmasMes, semana: firmasSemana },
      remisiones: { total: remisionesTotal, mes: remisionesMes },
      pagos: { total: pagosTotal, mes: pagosMes },
      seguimientos: { total: seguimientosTotal, mes: seguimientosMes },
      topFirmantes: topFirmantes.map(t => ({
        practitioner: practitionersMap.get(t.practitionerId),
        cantidad: t._count,
      })),
    };
  }

  // ==========================================
  // TIMELINE DE ACTIVIDAD
  // ==========================================

  async getTimeline(limit: number = 50) {
    const [firmas, remisiones, pagos] = await Promise.all([
      this.prisma.firmaBiometrica.findMany({
        include: {
          practitioner: { select: { firstName: true, lastName: true } },
        },
        orderBy: { fechaFirma: 'desc' },
        take: 20,
      }),
      this.prisma.remision.findMany({
        include: {
          capOrigen: { select: { nombre: true } },
          ipsDestino: { select: { nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.pagoADRES.findMany({
        include: {
          adresRegional: { select: { nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Combinar y ordenar
    const timeline: any[] = [];

    firmas.forEach(f => {
      timeline.push({
        id: f.id,
        tipo: 'firma',
        titulo: `Firma Biométrica - ${f.tipoAccion}`,
        descripcion: `${f.practitioner.firstName} ${f.practitioner.lastName} firmó ${f.entidadTipo}`,
        fecha: f.fechaFirma,
        icono: 'ScanFace',
        color: 'purple',
      });
    });

    remisiones.forEach(r => {
      timeline.push({
        id: r.id,
        tipo: 'remision',
        titulo: `Remisión ${r.estado}`,
        descripcion: `${r.capOrigen.nombre} → ${r.ipsDestino.nombre}`,
        fecha: r.createdAt,
        icono: 'ArrowRightLeft',
        color: 'indigo',
      });
    });

    pagos.forEach(p => {
      timeline.push({
        id: p.id,
        tipo: 'pago',
        titulo: `Pago ${p.estado}`,
        descripcion: `$${p.monto.toLocaleString()} - ${p.concepto}`,
        fecha: p.createdAt,
        icono: 'DollarSign',
        color: 'emerald',
      });
    });

    // Ordenar por fecha
    timeline.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return timeline.slice(0, limit);
  }
}
