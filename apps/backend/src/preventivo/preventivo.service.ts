import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PreventivoService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // PROGRAMAS PREVENTIVOS
  // ==========================================

  async crearPrograma(data: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    edadMinima?: number;
    edadMaxima?: number;
    genero?: string;
    frecuenciaMeses: number;
    tipo: string;
  }) {
    return this.prisma.programaPreventivo.create({ data });
  }

  async listarProgramas() {
    return this.prisma.programaPreventivo.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: { seguimientos: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerPrograma(id: string) {
    const programa = await this.prisma.programaPreventivo.findUnique({
      where: { id },
      include: {
        seguimientos: {
          take: 20,
          orderBy: { fechaProgramada: 'desc' },
        },
      },
    });

    if (!programa) throw new NotFoundException('Programa no encontrado');
    return programa;
  }

  // ==========================================
  // SEGUIMIENTOS
  // ==========================================

  async crearSeguimiento(data: {
    programaId: string;
    patientId: string;
    fechaProgramada: Date;
    notas?: string;
  }) {
    return this.prisma.seguimientoPreventivo.create({
      data,
      include: {
        programa: true,
      },
    });
  }

  async listarSeguimientos(filters?: {
    programaId?: string;
    patientId?: string;
    estado?: string;
    capId?: string;
  }) {
    const where: any = {};

    if (filters?.programaId) where.programaId = filters.programaId;
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.estado) where.estado = filters.estado;

    // Si se filtra por CAP, obtener pacientes de ese CAP
    if (filters?.capId) {
      const pacientesCap = await this.prisma.patient.findMany({
        where: { capAsignadoId: filters.capId },
        select: { id: true },
      });
      where.patientId = { in: pacientesCap.map(p => p.id) };
    }

    const seguimientos = await this.prisma.seguimientoPreventivo.findMany({
      where,
      include: {
        programa: {
          select: { nombre: true, tipo: true, codigo: true },
        },
      },
      orderBy: { fechaProgramada: 'asc' },
    });

    // Obtener info de pacientes
    const patientIds = [...new Set(seguimientos.map(s => s.patientId))];
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        docNumber: true,
        birthDate: true,
        capAsignado: { select: { nombre: true } },
      },
    });

    const patientsMap = new Map(patients.map(p => [p.id, p]));

    return seguimientos.map(s => ({
      ...s,
      patient: patientsMap.get(s.patientId),
    }));
  }

  async completarSeguimiento(id: string, resultado?: string, notas?: string) {
    return this.prisma.seguimientoPreventivo.update({
      where: { id },
      data: {
        estado: 'completado',
        fechaRealizada: new Date(),
        resultado,
        notas,
      },
    });
  }

  async cancelarSeguimiento(id: string, motivo: string) {
    return this.prisma.seguimientoPreventivo.update({
      where: { id },
      data: {
        estado: 'cancelado',
        notas: motivo,
      },
    });
  }

  // ==========================================
  // ALERTAS Y ESTADÍSTICAS
  // ==========================================

  async getAlertas(capId?: string) {
    const hoy = new Date();
    const hace7Dias = new Date(hoy);
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const proximos7Dias = new Date(hoy);
    proximos7Dias.setDate(proximos7Dias.getDate() + 7);

    // Filtro base
    let patientFilter: any = {};
    if (capId) {
      const pacientesCap = await this.prisma.patient.findMany({
        where: { capAsignadoId: capId },
        select: { id: true },
      });
      patientFilter = { patientId: { in: pacientesCap.map(p => p.id) } };
    }

    // Controles vencidos (fecha pasada y no completados)
    const vencidos = await this.prisma.seguimientoPreventivo.findMany({
      where: {
        ...patientFilter,
        estado: 'pendiente',
        fechaProgramada: { lt: hoy },
      },
      include: {
        programa: { select: { nombre: true, tipo: true } },
      },
      orderBy: { fechaProgramada: 'asc' },
      take: 20,
    });

    // Próximos 7 días
    const proximos = await this.prisma.seguimientoPreventivo.findMany({
      where: {
        ...patientFilter,
        estado: 'pendiente',
        fechaProgramada: {
          gte: hoy,
          lte: proximos7Dias,
        },
      },
      include: {
        programa: { select: { nombre: true, tipo: true } },
      },
      orderBy: { fechaProgramada: 'asc' },
      take: 20,
    });

    // Obtener info de pacientes
    const allPatientIds = [
      ...vencidos.map(v => v.patientId),
      ...proximos.map(p => p.patientId),
    ];
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: allPatientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        docNumber: true,
        phone: true,
        capAsignado: { select: { nombre: true } },
      },
    });
    const patientsMap = new Map(patients.map(p => [p.id, p]));

    return {
      vencidos: vencidos.map(v => ({ ...v, patient: patientsMap.get(v.patientId) })),
      proximos: proximos.map(p => ({ ...p, patient: patientsMap.get(p.patientId) })),
      resumen: {
        totalVencidos: vencidos.length,
        totalProximos: proximos.length,
      },
    };
  }

  async getEstadisticas(capId?: string) {
    let patientFilter: any = {};
    if (capId) {
      const pacientesCap = await this.prisma.patient.findMany({
        where: { capAsignadoId: capId },
        select: { id: true },
      });
      patientFilter = { patientId: { in: pacientesCap.map(p => p.id) } };
    }

    const [
      totalProgramas,
      totalSeguimientos,
      porEstado,
      porTipo,
    ] = await Promise.all([
      this.prisma.programaPreventivo.count({ where: { activo: true } }),
      this.prisma.seguimientoPreventivo.count({ where: patientFilter }),
      this.prisma.seguimientoPreventivo.groupBy({
        by: ['estado'],
        where: patientFilter,
        _count: true,
      }),
      this.prisma.seguimientoPreventivo.groupBy({
        by: ['programaId'],
        where: patientFilter,
        _count: true,
      }),
    ]);

    // Calcular tasa de cumplimiento
    const completados = porEstado.find(e => e.estado === 'completado')?._count || 0;
    const tasaCumplimiento = totalSeguimientos > 0 
      ? Math.round((completados / totalSeguimientos) * 100) 
      : 0;

    // Obtener nombres de programas
    const programas = await this.prisma.programaPreventivo.findMany({
      select: { id: true, nombre: true, tipo: true },
    });
    const programasMap = new Map(programas.map(p => [p.id, p]));

    return {
      totalProgramas,
      totalSeguimientos,
      tasaCumplimiento,
      porEstado,
      porPrograma: porTipo.map(t => ({
        programa: programasMap.get(t.programaId),
        cantidad: t._count,
      })),
    };
  }

  // ==========================================
  // GENERACIÓN AUTOMÁTICA DE SEGUIMIENTOS
  // ==========================================

  async generarSeguimientosParaPaciente(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { birthDate: true, gender: true },
    });

    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const edad = patient.birthDate 
      ? Math.floor((Date.now() - patient.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    // Obtener programas aplicables
    const programas = await this.prisma.programaPreventivo.findMany({
      where: {
        activo: true,
        OR: [
          { edadMinima: null, edadMaxima: null },
          { edadMinima: { lte: edad || 0 }, edadMaxima: { gte: edad || 100 } },
          { edadMinima: { lte: edad || 0 }, edadMaxima: null },
          { edadMinima: null, edadMaxima: { gte: edad || 100 } },
        ],
        AND: [
          {
            OR: [
              { genero: null },
              { genero: patient.gender === 'female' ? 'F' : 'M' },
            ],
          },
        ],
      },
    });

    const seguimientosCreados = [];

    for (const programa of programas) {
      // Verificar si ya tiene un seguimiento pendiente para este programa
      const existente = await this.prisma.seguimientoPreventivo.findFirst({
        where: {
          programaId: programa.id,
          patientId,
          estado: 'pendiente',
        },
      });

      if (!existente) {
        const fechaProgramada = new Date();
        fechaProgramada.setMonth(fechaProgramada.getMonth() + 1); // Próximo mes

        const seguimiento = await this.prisma.seguimientoPreventivo.create({
          data: {
            programaId: programa.id,
            patientId,
            fechaProgramada,
          },
        });
        seguimientosCreados.push({ ...seguimiento, programa });
      }
    }

    return seguimientosCreados;
  }
}
