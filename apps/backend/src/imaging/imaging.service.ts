import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImagingOrderDto } from './dto/create-imaging-order.dto';
import { CreateImagingResultDto } from './dto/create-imaging-result.dto';

@Injectable()
export class ImagingService {
  constructor(private prisma: PrismaService) {}

  async createOrder(createImagingOrderDto: CreateImagingOrderDto) {
    const order = await this.prisma.imagingOrder.create({
      data: {
        patientId: createImagingOrderDto.patientId,
        encounterId: createImagingOrderDto.encounterId,
        practitionerId: createImagingOrderDto.practitionerId,
        studyType: createImagingOrderDto.studyType,
        bodyRegion: createImagingOrderDto.bodyPart,
        clinicalInfo: createImagingOrderDto.clinicalIndication,
        priority: createImagingOrderDto.priority || 'routine',
        notes: createImagingOrderDto.notes,
        status: createImagingOrderDto.status || 'pending',
        orderDate: new Date(),
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        practitioner: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
    });

    return order;
  }

  async findAll() {
    return this.prisma.imagingOrder.findMany({
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        practitioner: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
        results: true,
      },
      orderBy: {
        orderDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.imagingOrder.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            docNumber: true,
            birthDate: true,
          },
        },
        practitioner: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
        results: true,
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.imagingOrder.findMany({
      where: { patientId },
      include: {
        practitioner: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
        results: true,
      },
      orderBy: {
        orderDate: 'desc',
      },
    });
  }

  async findByEncounter(encounterId: string) {
    return this.prisma.imagingOrder.findMany({
      where: { encounterId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        results: true,
      },
      orderBy: {
        orderDate: 'desc',
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.imagingOrder.update({
      where: { id },
      data: { status },
    });
  }

  async addResult(createImagingResultDto: CreateImagingResultDto) {
    const result = await this.prisma.imagingResult.create({
      data: {
        orderId: createImagingResultDto.orderId,
        studyDate: new Date(createImagingResultDto.studyDate),
        findings: createImagingResultDto.findings,
        impression: createImagingResultDto.impression,
        recommendation: createImagingResultDto.recommendation,
        status: createImagingResultDto.status || 'final',
        imageUrls: createImagingResultDto.imageUrls || [],
        reportedBy: createImagingResultDto.reportedBy,
        reportDate: new Date(),
      },
    });

    // Actualizar estado de la orden a completed
    await this.prisma.imagingOrder.update({
      where: { id: createImagingResultDto.orderId },
      data: { status: 'completed' },
    });

    return result;
  }

  async findPendingOrders() {
    return this.prisma.imagingOrder.findMany({
      where: {
        status: {
          in: ['pending', 'scheduled', 'in_progress'],
        },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            docNumber: true,
          },
        },
        practitioner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        results: true,
      },
      orderBy: {
        orderDate: 'desc',
      },
    });
  }

  async getResultsByOrder(orderId: string) {
    return this.prisma.imagingResult.findMany({
      where: { orderId },
      orderBy: {
        reportDate: 'desc',
      },
    });
  }
}
