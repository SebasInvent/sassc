import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('auditoria')
@UseGuards(JwtAuthGuard)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('resumen')
  getResumen() {
    return this.auditoriaService.getResumenAuditoria();
  }

  @Get('timeline')
  getTimeline(@Query('limit') limit?: string) {
    return this.auditoriaService.getTimeline(limit ? parseInt(limit) : 50);
  }

  @Get('firmas')
  getHistorialFirmas(
    @Query('tipoAccion') tipoAccion?: string,
    @Query('practitionerId') practitionerId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditoriaService.getHistorialFirmas({
      tipoAccion,
      practitionerId,
      limit: limit ? parseInt(limit) : 100,
    });
  }

  @Get('remisiones')
  getHistorialRemisiones(
    @Query('estado') estado?: string,
    @Query('capId') capId?: string,
    @Query('ipsId') ipsId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditoriaService.getHistorialRemisiones({
      estado,
      capId,
      ipsId,
      limit: limit ? parseInt(limit) : 100,
    });
  }

  @Get('pagos')
  getHistorialPagos(
    @Query('estado') estado?: string,
    @Query('ipsId') ipsId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditoriaService.getHistorialPagos({
      estado,
      ipsId,
      limit: limit ? parseInt(limit) : 100,
    });
  }

  @Get('preventivo')
  getHistorialPreventivo(
    @Query('estado') estado?: string,
    @Query('programaId') programaId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditoriaService.getHistorialPreventivo({
      estado,
      programaId,
      limit: limit ? parseInt(limit) : 100,
    });
  }
}
