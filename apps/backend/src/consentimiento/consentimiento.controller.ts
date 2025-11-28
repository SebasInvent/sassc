import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ConsentimientoService } from './consentimiento.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('consentimiento')
@UseGuards(JwtAuthGuard)
export class ConsentimientoController {
  constructor(private readonly consentimientoService: ConsentimientoService) {}

  @Post()
  crearConsentimiento(@Body() data: any) {
    return this.consentimientoService.crearConsentimiento(data);
  }

  @Put(':id/firmar')
  firmarConsentimiento(
    @Param('id') id: string,
    @Body() data: { firmaBiometricaId?: string; firmaDigital?: string },
  ) {
    return this.consentimientoService.firmarConsentimiento(id, data.firmaBiometricaId, data.firmaDigital);
  }

  @Put(':id/revocar')
  revocarConsentimiento(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    return this.consentimientoService.revocarConsentimiento(id, motivo);
  }

  @Get()
  listarConsentimientos(
    @Query('patientId') patientId?: string,
    @Query('tipo') tipo?: string,
    @Query('firmado') firmado?: string,
  ) {
    return this.consentimientoService.listarConsentimientos({
      patientId,
      tipo,
      firmado: firmado ? firmado === 'true' : undefined,
    });
  }

  @Get('paciente/:patientId')
  getConsentimientosPaciente(@Param('patientId') patientId: string) {
    return this.consentimientoService.getConsentimientosPaciente(patientId);
  }

  @Get('verificar/:patientId/:tipo')
  verificarConsentimiento(
    @Param('patientId') patientId: string,
    @Param('tipo') tipo: string,
  ) {
    return this.consentimientoService.verificarConsentimientoVigente(patientId, tipo);
  }

  @Get('plantillas')
  getPlantillas() {
    return this.consentimientoService.getPlantillas();
  }

  @Get('stats')
  getEstadisticas() {
    return this.consentimientoService.getEstadisticas();
  }
}
