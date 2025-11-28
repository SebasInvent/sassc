import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';

@Injectable()
export class LaboratoryService {
  constructor(private prisma: PrismaService) {}

  async createOrder(createLabOrderDto: CreateLabOrderDto) {
    const order = await this.prisma.laboratoryOrder.create({
      data: {
        patientId: createLabOrderDto.patientId,
        encounterId: createLabOrderDto.encounterId,
        practitionerId: createLabOrderDto.practitionerId,
        testCodes: createLabOrderDto.testCodes,
        priority: createLabOrderDto.priority || 'routine',
        notes: createLabOrderDto.notes,
        status: createLabOrderDto.status || 'pending',
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
    return this.prisma.laboratoryOrder.findMany({
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
    return this.prisma.laboratoryOrder.findUnique({
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
        results: {
          orderBy: {
            resultDate: 'desc',
          },
        },
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.laboratoryOrder.findMany({
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
    return this.prisma.laboratoryOrder.findMany({
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
    return this.prisma.laboratoryOrder.update({
      where: { id },
      data: { status },
    });
  }

  async addResult(createLabResultDto: CreateLabResultDto) {
    const result = await this.prisma.laboratoryResult.create({
      data: {
        orderId: createLabResultDto.orderId,
        testCode: createLabResultDto.testCode,
        testName: createLabResultDto.testName,
        result: createLabResultDto.result,
        unit: createLabResultDto.unit,
        referenceRange: createLabResultDto.referenceRange,
        status: createLabResultDto.status || 'final',
        interpretation: createLabResultDto.interpretation,
        resultDate: new Date(createLabResultDto.resultDate),
        reportedBy: createLabResultDto.reportedBy,
      },
    });

    // Actualizar estado de la orden si todos los resultados están listos
    await this.checkAndUpdateOrderStatus(createLabResultDto.orderId);

    return result;
  }

  private async checkAndUpdateOrderStatus(orderId: string) {
    const order = await this.prisma.laboratoryOrder.findUnique({
      where: { id: orderId },
      include: { results: true },
    });

    if (!order) return;

    const testCodes = order.testCodes as string[];
    const resultCodes = order.results.map((r) => r.testCode);

    // Si todos los tests tienen resultados, marcar como completado
    const allCompleted = testCodes.every((code) => resultCodes.includes(code));

    if (allCompleted && order.status !== 'completed') {
      await this.prisma.laboratoryOrder.update({
        where: { id: orderId },
        data: { status: 'completed' },
      });
    } else if (order.results.length > 0 && order.status === 'pending') {
      await this.prisma.laboratoryOrder.update({
        where: { id: orderId },
        data: { status: 'in_progress' },
      });
    }
  }

  async findPendingOrders() {
    return this.prisma.laboratoryOrder.findMany({
      where: {
        status: {
          in: ['pending', 'in_progress'],
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
    return this.prisma.laboratoryResult.findMany({
      where: { orderId },
      orderBy: {
        resultDate: 'desc',
      },
    });
  }
}
