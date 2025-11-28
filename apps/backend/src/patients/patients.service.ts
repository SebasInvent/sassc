import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    const baseInclude = {
      capAsignado: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          ciudad: true,
        },
      },
    };

    if (search) {
      return this.prisma.patient.findMany({
        where: {
          OR: [
            {
              firstName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              docNumber: {
                contains: search,
              },
            },
            {
              city: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        },
        include: baseInclude,
        orderBy: {
          lastName: 'asc',
        },
      });
    }

    return this.prisma.patient.findMany({
      include: baseInclude,
      orderBy: {
        lastName: 'asc',
      },
    });
  }

  async create(createPatientDto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: createPatientDto,
      include: {
        capAsignado: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.patient.findUnique({
      where: { id },
      include: {
        capAsignado: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            direccion: true,
            ciudad: true,
            departamento: true,
            telefono: true,
          },
        },
        appointments: {
          orderBy: { start: 'desc' },
          take: 10,
        },
        encounters: {
          orderBy: { start: 'desc' },
          take: 10,
        },
        conditions: {
          orderBy: { onsetDateTime: 'desc' },
        },
        observations: {
          orderBy: { effectiveDateTime: 'desc' },
          take: 20,
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        remisiones: {
          orderBy: { fechaSolicitud: 'desc' },
          take: 5,
          include: {
            capOrigen: {
              select: { nombre: true, ciudad: true },
            },
            ipsDestino: {
              select: { nombre: true, ciudad: true, nivelComplejidad: true },
            },
          },
        },
      },
    });
  }

  async update(id: string, updatePatientDto: Partial<CreatePatientDto>) {
    return this.prisma.patient.update({
      where: { id },
      data: updatePatientDto,
      include: {
        capAsignado: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.patient.delete({
      where: { id },
    });
  }

  // Buscar CAP más cercano por ciudad/departamento
  async findNearestCAP(city: string, department: string) {
    return this.prisma.cAP.findFirst({
      where: {
        ciudad: city,
        departamento: department,
        activo: true,
      },
      orderBy: {
        poblacionActual: 'asc', // Priorizar CAPs con menos población
      },
    });
  }

  // Asignar CAP a paciente automáticamente
  async assignCAP(patientId: string, capId: string) {
    // Actualizar paciente
    await this.prisma.patient.update({
      where: { id: patientId },
      data: { capAsignadoId: capId },
    });

    // Incrementar población del CAP
    await this.prisma.cAP.update({
      where: { id: capId },
      data: {
        poblacionActual: { increment: 1 },
      },
    });

    return this.findOne(patientId);
  }

  // Estadísticas de pacientes
  async getStats() {
    const [total, porRegimen, porDepartamento, conBiometria] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.patient.groupBy({
        by: ['regimen'],
        _count: true,
      }),
      this.prisma.patient.groupBy({
        by: ['department'],
        _count: true,
        orderBy: {
          _count: {
            department: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.patient.count({
        where: { biometricRegistered: true },
      }),
    ]);

    return {
      total,
      porRegimen,
      porDepartamento,
      conBiometria,
      sinBiometria: total - conBiometria,
    };
  }
}