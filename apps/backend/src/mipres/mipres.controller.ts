import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MipresService } from './mipres.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('mipres')
@UseGuards(JwtAuthGuard)
export class MipresController {
  constructor(private readonly mipresService: MipresService) {}

  @Post()
  crearPrescripcion(@Body() data: any) {
    return this.mipresService.crearPrescripcion(data);
  }

  @Post(':id/enviar')
  enviarAMipres(@Param('id') id: string) {
    return this.mipresService.enviarAMipres(id);
  }

  @Put(':id/dispensar')
  registrarDispensacion(
    @Param('id') id: string,
    @Body('cantidadEntregada') cantidadEntregada: number,
  ) {
    return this.mipresService.registrarDispensacion(id, cantidadEntregada);
  }

  @Get()
  listarPrescripciones(
    @Query('patientId') patientId?: string,
    @Query('practitionerId') practitionerId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.mipresService.listarPrescripciones({ patientId, practitionerId, estado });
  }

  @Get('stats')
  getEstadisticas() {
    return this.mipresService.getEstadisticas();
  }
}
