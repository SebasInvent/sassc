import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

@Injectable()
export class MedicationsService {
  constructor(private prisma: PrismaService) {}

  async createPrescription(createPrescriptionDto: CreatePrescriptionDto) {
    return this.prisma.prescription.create({
      data: {
        ...createPrescriptionDto,
        status: createPrescriptionDto.status || 'active',
      },
    });
  }

  async findAllPrescriptions() {
    return this.prisma.prescription.findMany({
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        encounter: {
          select: {
            id: true,
            status: true,
          },
        },
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPrescriptionsByPatient(patientId: string) {
    return this.prisma.prescription.findMany({
      where: { patientId },
      include: {
        practitioner: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
        encounter: {
          select: {
            id: true,
            start: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPrescriptionsByEncounter(encounterId: string) {
    return this.prisma.prescription.findMany({
      where: { encounterId },
      include: {
        practitioner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOnePrescription(id: string) {
    return this.prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        practitioner: true,
        encounter: true,
      },
    });
  }

  async updatePrescription(id: string, updatePrescriptionDto: UpdatePrescriptionDto) {
    return this.prisma.prescription.update({
      where: { id },
      data: updatePrescriptionDto,
    });
  }
}
