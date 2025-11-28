import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIpsDto, UpdateIpsDto } from './dto/ips.dto';
import { NivelComplejidad } from '@prisma/client';

@Injectable()
export class IpsService {
  constructor(private prisma: PrismaService) {}

  // Listar todas las IPS
  async findAll(filters?: {
    ciudad?: string;
    departamento?: string;
    nivelComplejidad?: NivelComplejidad;
    tipo?: string;
    activo?: boolean;
  }) {
    const where: any = {};
    
    if (filters?.ciudad) {
      where.ciudad = { contains: filters.ciudad, mode: 'insensitive' };
    }
    if (filters?.departamento) {
      where.departamento = { contains: filters.departamento, mode: 'insensitive' };
    }
    if (filters?.nivelComplejidad) {
      where.nivelComplejidad = filters.nivelComplejidad;
    }
    if (filters?.tipo) {
      where.tipo = filters.tipo;
    }
    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    }

    return this.prisma.iPS.findMany({
      where,
      include: {
        _count: {
          select: { remisionesDestino: true, personalIPS: true },
        },
        adresRegional: {
          select: { nombre: true, departamento: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  // Obtener una IPS por ID
  async findOne(id: string) {
    const ips = await this.prisma.iPS.findUnique({
      where: { id },
      include: {
        personalIPS: {
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
        remisionesDestino: {
          take: 20,
          orderBy: { fechaSolicitud: 'desc' },
          include: {
            patient: {
              select: { firstName: true, lastName: true, docNumber: true },
            },
            capOrigen: {
              select: { nombre: true, ciudad: true },
            },
          },
        },
        adresRegional: true,
        _count: {
          select: { remisionesDestino: true, personalIPS: true },
        },
      },
    });

    if (!ips) {
      throw new NotFoundException(`IPS con ID ${id} no encontrada`);
    }

    return ips;
  }

  // Crear una nueva IPS
  async create(createIpsDto: CreateIpsDto) {
    return this.prisma.iPS.create({
      data: {
        ...createIpsDto,
        servicios: createIpsDto.servicios || [],
      },
    });
  }

  // Actualizar una IPS
  async update(id: string, updateIpsDto: UpdateIpsDto) {
    return this.prisma.iPS.update({
      where: { id },
      data: updateIpsDto,
    });
  }

  // Eliminar una IPS
  async remove(id: string) {
    return this.prisma.iPS.delete({
      where: { id },
    });
  }

  // Estadísticas de una IPS
  async getStats(id: string) {
    const ips = await this.prisma.iPS.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            remisionesDestino: true,
            personalIPS: true,
          },
        },
      },
    });

    if (!ips) {
      throw new NotFoundException(`IPS con ID ${id} no encontrada`);
    }

    // Remisiones pendientes
    const remisionesPendientes = await this.prisma.remision.count({
      where: {
        ipsDestinoId: id,
        estado: { in: ['SOLICITADA', 'APROBADA', 'EN_PROCESO'] },
      },
    });

    // Remisiones completadas este mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const remisionesCompletadasMes = await this.prisma.remision.count({
      where: {
        ipsDestinoId: id,
        estado: 'COMPLETADA',
        fechaAtencion: { gte: inicioMes },
      },
    });

    return {
      ...ips,
      remisionesPendientes,
      remisionesCompletadasMes,
    };
  }

  // Estadísticas generales de todas las IPS
  async getGeneralStats() {
    const [
      totalIps,
      ipsActivas,
      porNivel,
      porTipo,
      remisionesPendientes,
    ] = await Promise.all([
      this.prisma.iPS.count(),
      this.prisma.iPS.count({ where: { activo: true } }),
      this.prisma.iPS.groupBy({
        by: ['nivelComplejidad'],
        _count: true,
      }),
      this.prisma.iPS.groupBy({
        by: ['tipo'],
        _count: true,
      }),
      this.prisma.remision.count({
        where: { estado: { in: ['SOLICITADA', 'APROBADA', 'EN_PROCESO'] } },
      }),
    ]);

    const ipsPorDepartamento = await this.prisma.iPS.groupBy({
      by: ['departamento'],
      _count: true,
      orderBy: {
        _count: {
          departamento: 'desc',
        },
      },
    });

    return {
      totalIps,
      ipsActivas,
      ipsInactivas: totalIps - ipsActivas,
      porNivel,
      porTipo,
      ipsPorDepartamento,
      remisionesPendientes,
    };
  }

  // Buscar IPS cercanas por especialidad
  async findByEspecialidad(especialidad: string, ciudad?: string, departamento?: string) {
    const where: any = {
      activo: true,
      servicios: {
        array_contains: [especialidad],
      },
    };

    if (ciudad) {
      where.ciudad = ciudad;
    }
    if (departamento) {
      where.departamento = departamento;
    }

    return this.prisma.iPS.findMany({
      where,
      orderBy: [
        { ciudad: 'asc' },
        { nivelComplejidad: 'asc' },
      ],
    });
  }

  // Asignar personal a una IPS
  async assignPersonal(ipsId: string, practitionerId: string, cargo: string, especialidad?: string, esDirector: boolean = false) {
    return this.prisma.personalIPS.create({
      data: {
        ipsId,
        practitionerId,
        cargo,
        especialidad,
        esDirector,
      },
      include: {
        practitioner: true,
        ips: true,
      },
    });
  }

  // Remover personal de una IPS
  async removePersonal(ipsId: string, practitionerId: string) {
    return this.prisma.personalIPS.delete({
      where: {
        ipsId_practitionerId: {
          ipsId,
          practitionerId,
        },
      },
    });
  }
}
