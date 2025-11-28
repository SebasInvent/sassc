import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthorizationDto } from './dto/create-authorization.dto';

@Injectable()
export class AuthorizationsService {
  constructor(private prisma: PrismaService) {}

  async create(createAuthorizationDto: CreateAuthorizationDto) {
    // Generar número de autorización único
    const authNumber = `AUTH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return this.prisma.authorization.create({
      data: {
        ...createAuthorizationDto,
        authorizationNumber: authNumber,
      },
      include: {
        prescription: {
          select: {
            medicationName: true,
            dosage: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        requester: {
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
    return this.prisma.authorization.findMany({
      include: {
        prescription: {
          select: {
            medicationName: true,
            dosage: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        requestDate: 'desc',
      },
    });
  }

  async findPending() {
    return this.prisma.authorization.findMany({
      where: {
        status: 'pending',
      },
      include: {
        prescription: {
          select: {
            medicationName: true,
            dosage: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { requestDate: 'asc' },
      ],
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.authorization.findMany({
      where: { patientId },
      include: {
        prescription: {
          select: {
            medicationName: true,
          },
        },
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        requestDate: 'desc',
      },
    });
  }

  async findByPrescription(prescriptionId: string) {
    return this.prisma.authorization.findMany({
      where: { prescriptionId },
      include: {
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        requestDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.authorization.findUnique({
      where: { id },
      include: {
        prescription: true,
        patient: true,
        requester: true,
        reviewer: true,
      },
    });
  }

  async approve(id: string, reviewerId: string, approvedQuantity: number, validUntil: Date, notes?: string) {
    return this.prisma.authorization.update({
      where: { id },
      data: {
        status: 'approved',
        reviewerId,
        approvedQuantity,
        validUntil,
        responseDate: new Date(),
        notes,
      },
      include: {
        prescription: true,
        patient: true,
      },
    });
  }

  async deny(id: string, reviewerId: string, denialReason: string) {
    return this.prisma.authorization.update({
      where: { id },
      data: {
        status: 'denied',
        reviewerId,
        denialReason,
        responseDate: new Date(),
      },
      include: {
        prescription: true,
        patient: true,
      },
    });
  }

  async cancel(id: string, reason: string) {
    return this.prisma.authorization.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: reason,
      },
    });
  }
}
