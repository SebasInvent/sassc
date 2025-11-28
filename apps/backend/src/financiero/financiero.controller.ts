import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FinancieroService } from './financiero.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('financiero')
@UseGuards(JwtAuthGuard)
export class FinancieroController {
  constructor(private readonly financieroService: FinancieroService) {}

  // ==========================================
  // GIROS DIRECTOS
  // ==========================================

  @Post('giros')
  crearGiro(@Body() data: {
    adresRegionalId: string;
    ipsDestinoId: string;
    concepto: string;
    monto: number;
    numeroFactura?: string;
    periodo?: string;
  }) {
    return this.financieroService.crearGiro(data);
  }

  @Get('giros')
  listarGiros(
    @Query('adresRegionalId') adresRegionalId?: string,
    @Query('ipsDestinoId') ipsDestinoId?: string,
    @Query('estado') estado?: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.financieroService.listarGiros({
      adresRegionalId,
      ipsDestinoId,
      estado,
      periodo,
    });
  }

  @Get('giros/:id')
  obtenerGiro(@Param('id') id: string) {
    return this.financieroService.obtenerGiro(id);
  }

  @Put('giros/:id/aprobar')
  aprobarGiro(
    @Param('id') id: string,
    @Body('aprobadorId') aprobadorId: string,
  ) {
    return this.financieroService.aprobarGiro(id, aprobadorId);
  }

  @Put('giros/:id/rechazar')
  rechazarGiro(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    return this.financieroService.rechazarGiro(id, motivo);
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  @Get('stats')
  getEstadisticas() {
    return this.financieroService.getEstadisticasGenerales();
  }

  @Get('stats/adres/:id')
  getEstadisticasAdres(@Param('id') id: string) {
    return this.financieroService.getEstadisticasPorAdres(id);
  }

  // ==========================================
  // ADRES REGIONALES
  // ==========================================

  @Get('adres')
  listarAdres() {
    return this.financieroService.listarAdresRegionales();
  }

  @Get('adres/:id')
  obtenerAdres(@Param('id') id: string) {
    return this.financieroService.obtenerAdresRegional(id);
  }
}
