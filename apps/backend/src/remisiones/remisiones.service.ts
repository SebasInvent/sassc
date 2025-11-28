import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRemisionDto, UpdateRemisionDto } from './dto/remision.dto';
import { EstadoRemision } from '@prisma/client';

@Injectable()
export class RemisionesService {
  constructor(private prisma: PrismaService) {}

  // Generar código único de remisión
  private async generateCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.remision.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });
    return `REM-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // Crear una nueva remisión
  async create(createRemisionDto: CreateRemisionDto) {
    const codigo = await this.generateCodigo();

    // Verificar que el paciente existe y está asignado al CAP
    const patient = await this.prisma.patient.findUnique({
      where: { id: createRemisionDto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    // Verificar que el CAP existe
    const cap = await this.prisma.cAP.findUnique({
      where: { id: createRemisionDto.capOrigenId },
    });

    if (!cap) {
      throw new NotFoundException('CAP de origen no encontrado');
    }

    // Verificar que la IPS existe
    const ips = await this.prisma.iPS.findUnique({
      where: { id: createRemisionDto.ipsDestinoId },
    });

    if (!ips) {
      throw new NotFoundException('IPS de destino no encontrada');
    }

    return this.prisma.remision.create({
      data: {
        codigo,
        ...createRemisionDto,
        prioridad: createRemisionDto.prioridad || 'normal',
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, docNumber: true },
        },
        capOrigen: {
          select: { nombre: true, ciudad: true },
        },
        ipsDestino: {
          select: { nombre: true, ciudad: true, nivelComplejidad: true },
        },
      },
    });
  }

  // Listar remisiones con filtros
  async findAll(filters?: {
    capOrigenId?: string;
    ipsDestinoId?: string;
    estado?: EstadoRemision;
    prioridad?: string;
    patientId?: string;
  }) {
    const where: any = {};

    if (filters?.capOrigenId) where.capOrigenId = filters.capOrigenId;
    if (filters?.ipsDestinoId) where.ipsDestinoId = filters.ipsDestinoId;
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.prioridad) where.prioridad = filters.prioridad;
    if (filters?.patientId) where.patientId = filters.patientId;

    return this.prisma.remision.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, docNumber: true },
        },
        capOrigen: {
          select: { id: true, nombre: true, ciudad: true },
        },
        ipsDestino: {
          select: { id: true, nombre: true, ciudad: true, nivelComplejidad: true },
        },
      },
      orderBy: [
        { prioridad: 'asc' }, // urgente primero
        { fechaSolicitud: 'desc' },
      ],
    });
  }

  // Obtener una remisión por ID
  async findOne(id: string) {
    const remision = await this.prisma.remision.findUnique({
      where: { id },
      include: {
        patient: true,
        capOrigen: true,
        ipsDestino: true,
      },
    });

    if (!remision) {
      throw new NotFoundException(`Remisión con ID ${id} no encontrada`);
    }

    return remision;
  }

  // Obtener remisión por código
  async findByCodigo(codigo: string) {
    const remision = await this.prisma.remision.findUnique({
      where: { codigo },
      include: {
        patient: true,
        capOrigen: true,
        ipsDestino: true,
      },
    });

    if (!remision) {
      throw new NotFoundException(`Remisión con código ${codigo} no encontrada`);
    }

    return remision;
  }

  // Actualizar remisión
  async update(id: string, updateRemisionDto: UpdateRemisionDto) {
    return this.prisma.remision.update({
      where: { id },
      data: updateRemisionDto,
      include: {
        patient: true,
        capOrigen: true,
        ipsDestino: true,
      },
    });
  }

  // Aprobar remisión
  async approve(id: string, notas?: string) {
    return this.prisma.remision.update({
      where: { id },
      data: {
        estado: 'APROBADA',
        fechaAprobacion: new Date(),
        notas: notas || undefined,
      },
    });
  }

  // Rechazar remisión
  async reject(id: string, notas: string) {
    if (!notas) {
      throw new BadRequestException('Debe proporcionar una razón para rechazar la remisión');
    }

    return this.prisma.remision.update({
      where: { id },
      data: {
        estado: 'RECHAZADA',
        notas,
      },
    });
  }

  // Marcar como en proceso
  async startProcess(id: string) {
    return this.prisma.remision.update({
      where: { id },
      data: {
        estado: 'EN_PROCESO',
      },
    });
  }

  // Completar remisión
  async complete(id: string, resultadoAtencion: string, notas?: string) {
    return this.prisma.remision.update({
      where: { id },
      data: {
        estado: 'COMPLETADA',
        fechaAtencion: new Date(),
        resultadoAtencion,
        notas: notas || undefined,
      },
    });
  }

  // Cancelar remisión
  async cancel(id: string, notas: string) {
    return this.prisma.remision.update({
      where: { id },
      data: {
        estado: 'CANCELADA',
        notas,
      },
    });
  }

  // Estadísticas de remisiones
  async getStats() {
    const [
      total,
      porEstado,
      porPrioridad,
      tiempoPromedioAtencion,
    ] = await Promise.all([
      this.prisma.remision.count(),
      this.prisma.remision.groupBy({
        by: ['estado'],
        _count: true,
      }),
      this.prisma.remision.groupBy({
        by: ['prioridad'],
        _count: true,
      }),
      // Calcular tiempo promedio de atención (solo completadas)
      this.prisma.remision.findMany({
        where: {
          estado: 'COMPLETADA',
          fechaAtencion: { not: null },
        },
        select: {
          fechaSolicitud: true,
          fechaAtencion: true,
        },
      }),
    ]);

    // Calcular promedio de días
    let promedioDias = 0;
    if (tiempoPromedioAtencion.length > 0) {
      const totalDias = tiempoPromedioAtencion.reduce((acc, r) => {
        const diff = r.fechaAtencion!.getTime() - r.fechaSolicitud.getTime();
        return acc + diff / (1000 * 60 * 60 * 24);
      }, 0);
      promedioDias = totalDias / tiempoPromedioAtencion.length;
    }

    // Alertas de "paseo de la muerte" - remisiones pendientes por más de 7 días
    const paseoMuerte = await this.prisma.remision.count({
      where: {
        estado: { in: ['SOLICITADA', 'APROBADA'] },
        fechaSolicitud: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      total,
      porEstado,
      porPrioridad,
      tiempoPromedioAtencionDias: promedioDias.toFixed(1),
      alertasPaseoMuerte: paseoMuerte,
    };
  }

  // Buscar IPS cercana para remisión (territorialización)
  async findNearestIps(capId: string, especialidad: string) {
    const cap = await this.prisma.cAP.findUnique({
      where: { id: capId },
    });

    if (!cap) {
      throw new NotFoundException('CAP no encontrado');
    }

    // Buscar IPS en la misma ciudad primero, luego en el departamento
    const ipsEnCiudad = await this.prisma.iPS.findMany({
      where: {
        ciudad: cap.ciudad,
        activo: true,
        servicios: {
          array_contains: [especialidad],
        },
      },
      orderBy: { nivelComplejidad: 'asc' },
    });

    if (ipsEnCiudad.length > 0) {
      return ipsEnCiudad;
    }

    // Si no hay en la ciudad, buscar en el departamento
    return this.prisma.iPS.findMany({
      where: {
        departamento: cap.departamento,
        activo: true,
        servicios: {
          array_contains: [especialidad],
        },
      },
      orderBy: { nivelComplejidad: 'asc' },
    });
  }
}
