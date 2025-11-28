import { Controller, Post, Body, UseGuards, Req, Get, Param } from '@nestjs/common';
import { Request } from 'express';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/Observation')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createObservationDto: CreateObservationDto, @Req() req: any) {
    const practitionerId = req.user.sub;
    return this.observationsService.create(createObservationDto, practitionerId);
  }

  @Get('for-encounter/:encounterId')
  @UseGuards(JwtAuthGuard)
  findAllForEncounter(@Param('encounterId') encounterId: string) {
    // Por ahora, permitimos leer sin validar el token de encuentro, 
    // ya que nuestro flujo principal no lo usa.
    // La seguridad real vendría de no exponer esta ruta a los pacientes.
    return this.observationsService.findAllForEncounter(encounterId);
  }
}