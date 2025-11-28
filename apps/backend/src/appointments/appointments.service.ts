import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  create(createAppointmentDto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: createAppointmentDto,
    });
  }

  async findAllForPatient(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        practitioner: true,
        organization: true,
        encounter: true,
      },
      orderBy: { start: 'desc' },
    });
  }

  async findTodaysAppointmentsForPractitioner(practitionerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.appointment.findMany({
      where: {
        practitionerId,
        start: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: true,
        organization: true,
        encounter: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        start: 'asc',
      },
    });
  }

  async findOneById(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        organization: true,
        encounter: {
          include: {
            observations: true,
            conditions: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.appointment.findMany({
      include: {
        encounter: {
          select: {
            id: true,
          },
        },
      },
    });
  }
}