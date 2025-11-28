import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncounterStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class EncountersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async performCheckIn(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada.');
    }
    
    // Aquí irían más validaciones, como verificar que la cita es para hoy.

    const encounter = await this.prisma.encounter.create({
      data: {
        status: EncounterStatus.arrived,
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        start: new Date(),
      },
    });

    return encounter;
  }

  async performTriage(encounterId: string, practitionerId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
    });

    if (!encounter || encounter.status !== EncounterStatus.arrived) {
      throw new BadRequestException('Encuentro no válido para triage.');
    }

    return this.prisma.encounter.update({
      where: { id: encounterId },
      data: {
        status: EncounterStatus.triaged,
        practitionerId: practitionerId,
      },
    });
  }

  async grantAccess(encounterId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
    });

    if (!encounter || encounter.status !== EncounterStatus.triaged) {
      throw new BadRequestException('Encuentro no válido para otorgar acceso.');
    }

    const payload = {
      sub: encounter.practitionerId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      scope: 'read:patient-data',
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async startEncounter(appointmentId: string, practitionerId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { encounter: true },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (appointment.encounter) {
      throw new BadRequestException('Esta cita ya tiene un encuentro asociado.');
    }

    const encounter = await this.prisma.encounter.create({
      data: {
        status: EncounterStatus.in_progress,
        patientId: appointment.patientId,
        practitionerId: practitionerId,
        appointmentId: appointment.id,
        start: new Date(),
      },
    });

    // Opcional: Actualizar el estado de la cita también
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'arrived' }, // o 'in-progress' si existiera
    });

    return encounter;
  }

  async finish(encounterId: string, practitionerId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
    });

    if (!encounter) {
      throw new NotFoundException('Encuentro no encontrado.');
    }

    if (encounter.practitionerId !== practitionerId) {
      throw new UnauthorizedException('No tiene permiso para finalizar este encuentro.');
    }

    if (encounter.status === EncounterStatus.finished) {
      throw new BadRequestException('Este encuentro ya ha sido finalizado.');
    }

    return this.prisma.encounter.update({
      where: { id: encounterId },
      data: {
        status: EncounterStatus.finished,
        end: new Date(),
      },
    });
  }
}