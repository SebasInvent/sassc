import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDispensationDto } from './dto/create-dispensation.dto';

@Injectable()
export class DispensationsService {
  constructor(private prisma: PrismaService) {}

  async create(createDispensationDto: CreateDispensationDto) {
    return this.prisma.dispensation.create({
      data: createDispensationDto,
      include: {
        prescription: {
          select: {
            medicationName: true,
            dosage: true,
            frequency: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        dispenser: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.dispensation.findMany({
      include: {
        prescription: {
          select: {
            medicationName: true,
            medicationCode: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        dispenser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        dispensedDate: 'desc',
      },
    });
  }

  async findByPrescription(prescriptionId: string) {
    return this.prisma.dispensation.findMany({
      where: { prescriptionId },
      include: {
        dispenser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        dispensedDate: 'desc',
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.dispensation.findMany({
      where: { patientId },
      include: {
        prescription: {
          select: {
            medicationName: true,
            dosage: true,
          },
        },
        dispenser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        dispensedDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.dispensation.findUnique({
      where: { id },
      include: {
        prescription: true,
        patient: true,
        dispenser: true,
      },
    });
  }
}
