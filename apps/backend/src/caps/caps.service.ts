import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCapDto, UpdateCapDto } from './dto/cap.dto';

@Injectable()
export class CapsService {
  constructor(private prisma: PrismaService) {}

  // Listar todos los CAPs
  async findAll(filters?: {
    ciudad?: string;
    departamento?: string;
    activo?: boolean;
  }) {
    const where: any = {};
    
    if (filters?.ciudad) {
      where.ciudad = { contains: filters.ciudad, mode: 'insensitive' };
    }
    if (filters?.departamento) {
      where.departamento = { contains: filters.departamento, mode: 'insensitive' };
    }
    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    }

    return this.prisma.cAP.findMany({
      where,
      include: {
        _count: {
          select: { pacientes: true, personal: true, citas: true },
        },
        adresRegional: {
          select: { nombre: true, departamento: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  // Obtener un CAP por ID
  async findOne(id: string) {
    const cap = await this.prisma.cAP.findUnique({
      where: { id },
      include: {
        pacientes: {
          take: 10,
          orderBy: { lastName: 'asc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        personal: {
          include: {
            practitioner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialty: true,
                license: true,
              },
            },
          },
        },
        citas: {
          take: 20,
          orderBy: { fechaHora: 'desc' },
        },
        remisionesOrigen: {
          take: 10,
          orderBy: { fechaSolicitud: 'desc' },
          include: {
            patient: {
              select: { firstName: true, lastName: true },
            },
            ipsDestino: {
              select: { nombre: true, ciudad: true },
            },
          },
        },
        adresRegional: true,
        _count: {
          select: { pacientes: true, personal: true, citas: true, remisionesOrigen: true },
        },
      },
    });

    if (!cap) {
      throw new NotFoundException(`CAP con ID ${id} no encontrado`);
    }

    return cap;
  }

  // Crear un nuevo CAP
  async create(createCapDto: CreateCapDto) {
    return this.prisma.cAP.create({
      data: createCapDto,
    });
  }

  // Actualizar un CAP
  async update(id: string, updateCapDto: UpdateCapDto) {
    return this.prisma.cAP.update({
      where: { id },
      data: updateCapDto,
    });
  }

  // Eliminar un CAP
  async remove(id: string) {
    return this.prisma.cAP.delete({
      where: { id },
    });
  }

  // Estadísticas de un CAP
  async getStats(id: string) {
    const cap = await this.prisma.cAP.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            pacientes: true,
            personal: true,
            citas: true,
            remisionesOrigen: true,
          },
        },
      },
    });

    if (!cap) {
      throw new NotFoundException(`CAP con ID ${id} no encontrado`);
    }

    // Citas de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const citasHoy = await this.prisma.citaCAP.count({
      where: {
        capId: id,
        fechaHora: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const citasPendientes = await this.prisma.citaCAP.count({
      where: {
        capId: id,
        estado: 'programada',
      },
    });

    return {
      ...cap,
      citasHoy,
      citasPendientes,
      capacidadDisponible: cap.poblacionAsignada - cap.poblacionActual,
      porcentajeOcupacion: ((cap.poblacionActual / cap.poblacionAsignada) * 100).toFixed(1),
    };
  }

  // Estadísticas generales de todos los CAPs
  async getGeneralStats() {
    const [
      totalCaps,
      capsActivos,
      totalPacientesAsignados,
      totalPersonal,
      citasHoy,
    ] = await Promise.all([
      this.prisma.cAP.count(),
      this.prisma.cAP.count({ where: { activo: true } }),
      this.prisma.patient.count({ where: { capAsignadoId: { not: null } } }),
      this.prisma.personalCAP.count({ where: { activo: true } }),
      this.prisma.citaCAP.count({
        where: {
          fechaHora: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    const capsPorDepartamento = await this.prisma.cAP.groupBy({
      by: ['departamento'],
      _count: true,
      orderBy: {
        _count: {
          departamento: 'desc',
        },
      },
    });

    return {
      totalCaps,
      capsActivos,
      capsInactivos: totalCaps - capsActivos,
      totalPacientesAsignados,
      totalPersonal,
      citasHoy,
      capsPorDepartamento,
    };
  }

  // Asignar personal a un CAP
  async assignPersonal(capId: string, practitionerId: string, cargo: string, esDirector: boolean = false) {
    return this.prisma.personalCAP.create({
      data: {
        capId,
        practitionerId,
        cargo,
        esDirector,
      },
      include: {
        practitioner: true,
        cap: true,
      },
    });
  }

  // Remover personal de un CAP
  async removePersonal(capId: string, practitionerId: string) {
    return this.prisma.personalCAP.delete({
      where: {
        capId_practitionerId: {
          capId,
          practitionerId,
        },
      },
    });
  }
}
