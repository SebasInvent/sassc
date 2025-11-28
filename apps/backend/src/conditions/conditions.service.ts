import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConditionDto } from './dto/create-condition.dto';

@Injectable()
export class ConditionsService {
  constructor(private prisma: PrismaService) {}

  async create(createConditionDto: CreateConditionDto, practitionerId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: createConditionDto.encounterId },
    });

    if (!encounter) {
      throw new NotFoundException('Encuentro no encontrado.');
    }

    if (encounter.practitionerId !== practitionerId) {
      throw new UnauthorizedException('No tiene permiso para registrar diagnósticos en este encuentro.');
    }

    return this.prisma.condition.create({
      data: {
        ...createConditionDto,
        patientId: encounter.patientId,
        asserterId: practitionerId,
      },
    });
  }

  async findAllForEncounter(encounterId: string) {
    return this.prisma.condition.findMany({
      where: { encounterId },
    });
  }
}