import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKpis() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalPatients, appointmentsToday, activePractitioners] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.appointment.count({
        where: {
          start: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      this.prisma.practitioner.count(),
    ]);

    return {
      totalPatients,
      appointmentsToday,
      activePractitioners,
    };
  }
}