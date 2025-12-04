import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

export interface RegisterWithBiometricDto {
  // Datos del paciente
  docType: string;
  docNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: string;
  phone?: string;
  city?: string;
  department?: string;
  bloodType?: string;
  // Biometría facial
  faceDescriptors?: string[]; // Array de descriptores 512D en formato string
  faceImages?: string[]; // Base64 de las 5 fotos
}

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);
  
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

  // Registro completo con biometría facial
  async registerWithBiometric(data: RegisterWithBiometricDto) {
    this.logger.log(`📝 Registrando paciente con biometría: ${data.docNumber}`);
    
    // Verificar si ya existe
    const existing = await this.prisma.patient.findUnique({
      where: { docNumber: data.docNumber },
    });

    const captureAngles = ['FRONTAL', 'LEFT', 'RIGHT', 'UP', 'DOWN'];

    if (existing) {
      this.logger.log(`🔄 Paciente existente, actualizando biometría: ${data.docNumber}`);
      
      // Actualizar biometría si hay descriptores
      if (data.faceDescriptors?.length) {
        // Eliminar embeddings anteriores
        await this.prisma.insightFaceEmbedding.deleteMany({
          where: { patientId: existing.id },
        });

        // Crear nuevos embeddings
        for (let i = 0; i < data.faceDescriptors.length; i++) {
          const hash = require('crypto').createHash('sha256').update(data.faceDescriptors[i]).digest('hex');
          await this.prisma.insightFaceEmbedding.create({
            data: {
              patientId: existing.id,
              embedding: data.faceDescriptors[i],
              embeddingHash: hash,
              captureAngle: captureAngles[i] || 'FRONTAL',
              quality: 0.95,
              isActive: true,
              isPrimary: i === 0,
            },
          });
        }

        await this.prisma.patient.update({
          where: { id: existing.id },
          data: {
            biometricRegistered: true,
            faceRegisteredAt: new Date(),
          },
        });
      }

      return {
        success: true,
        isNew: false,
        patient: await this.findOne(existing.id),
        message: 'Paciente actualizado con biometría',
      };
    }

    // Crear nuevo paciente
    const patient = await this.prisma.patient.create({
      data: {
        docType: data.docType as any,
        docNumber: data.docNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: new Date(data.birthDate),
        gender: data.gender,
        phone: data.phone,
        city: data.city,
        department: data.department || 'Colombia',
        bloodType: data.bloodType,
        biometricRegistered: !!data.faceDescriptors?.length,
        faceRegisteredAt: data.faceDescriptors?.length ? new Date() : null,
      },
    });

    this.logger.log(`✅ Paciente creado: ${patient.id}`);

    // Crear embeddings si hay descriptores
    if (data.faceDescriptors?.length) {
      for (let i = 0; i < data.faceDescriptors.length; i++) {
        const hash = require('crypto').createHash('sha256').update(data.faceDescriptors[i]).digest('hex');
        await this.prisma.insightFaceEmbedding.create({
          data: {
            patientId: patient.id,
            embedding: data.faceDescriptors[i],
            embeddingHash: hash,
            captureAngle: captureAngles[i] || 'FRONTAL',
            quality: 0.95,
            isActive: true,
            isPrimary: i === 0,
          },
        });
      }
      this.logger.log(`🔐 Biometría facial guardada: ${data.faceDescriptors.length} embeddings`);
    }

    return {
      success: true,
      isNew: true,
      patient: await this.findOne(patient.id),
      message: 'Paciente registrado exitosamente',
    };
  }

  // Buscar paciente por número de documento
  async findByDocNumber(docNumber: string) {
    return this.prisma.patient.findUnique({
      where: { docNumber },
      include: {
        insightEmbeddings: true,
        capAsignado: true,
      },
    });
  }
}