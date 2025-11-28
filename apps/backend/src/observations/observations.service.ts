import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObservationDto } from './dto/create-observation.dto';

@Injectable()
export class ObservationsService {
  constructor(private prisma: PrismaService) {}

  async create(createObservationDto: CreateObservationDto, practitionerId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: createObservationDto.encounterId },
    });

    if (!encounter) {
      throw new NotFoundException('Encuentro no encontrado.');
    }

    // Validación de seguridad: El médico que crea la observación debe ser el asignado al encuentro.
    if (encounter.practitionerId !== practitionerId) {
      throw new UnauthorizedException('No tiene permiso para registrar observaciones en este encuentro.');
    }

    const { valueQuantity, valueUnit, valueString, ...restOfDto } = createObservationDto;

    return this.prisma.observation.create({
      data: {
        ...restOfDto,
        valueQuantity,
        valueUnit,
        valueString,
        status: 'final', // Las observaciones se guardan como finales por defecto
        patientId: encounter.patientId,
        performerId: practitionerId,
      },
    });
  }

  async findAllForEncounter(encounterId: string) {
    return this.prisma.observation.findMany({
      where: { encounterId },
    });
  }
}