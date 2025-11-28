import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PreventivoService } from './preventivo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('preventivo')
@UseGuards(JwtAuthGuard)
export class PreventivoController {
  constructor(private readonly preventivoService: PreventivoService) {}

  // ==========================================
  // PROGRAMAS
  // ==========================================

  @Post('programas')
  crearPrograma(@Body() data: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    edadMinima?: number;
    edadMaxima?: number;
    genero?: string;
    frecuenciaMeses: number;
    tipo: string;
  }) {
    return this.preventivoService.crearPrograma(data);
  }

  @Get('programas')
  listarProgramas() {
    return this.preventivoService.listarProgramas();
  }

  @Get('programas/:id')
  obtenerPrograma(@Param('id') id: string) {
    return this.preventivoService.obtenerPrograma(id);
  }

  // ==========================================
  // SEGUIMIENTOS
  // ==========================================

  @Post('seguimientos')
  crearSeguimiento(@Body() data: {
    programaId: string;
    patientId: string;
    fechaProgramada: string;
    notas?: string;
  }) {
    return this.preventivoService.crearSeguimiento({
      ...data,
      fechaProgramada: new Date(data.fechaProgramada),
    });
  }

  @Get('seguimientos')
  listarSeguimientos(
    @Query('programaId') programaId?: string,
    @Query('patientId') patientId?: string,
    @Query('estado') estado?: string,
    @Query('capId') capId?: string,
  ) {
    return this.preventivoService.listarSeguimientos({
      programaId,
      patientId,
      estado,
      capId,
    });
  }

  @Put('seguimientos/:id/completar')
  completarSeguimiento(
    @Param('id') id: string,
    @Body() data: { resultado?: string; notas?: string },
  ) {
    return this.preventivoService.completarSeguimiento(id, data.resultado, data.notas);
  }

  @Put('seguimientos/:id/cancelar')
  cancelarSeguimiento(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    return this.preventivoService.cancelarSeguimiento(id, motivo);
  }

  // ==========================================
  // ALERTAS Y ESTADÍSTICAS
  // ==========================================

  @Get('alertas')
  getAlertas(@Query('capId') capId?: string) {
    return this.preventivoService.getAlertas(capId);
  }

  @Get('stats')
  getEstadisticas(@Query('capId') capId?: string) {
    return this.preventivoService.getEstadisticas(capId);
  }

  // ==========================================
  // GENERACIÓN AUTOMÁTICA
  // ==========================================

  @Post('generar/:patientId')
  generarSeguimientos(@Param('patientId') patientId: string) {
    return this.preventivoService.generarSeguimientosParaPaciente(patientId);
  }
}
