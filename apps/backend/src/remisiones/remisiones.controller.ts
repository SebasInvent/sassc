import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RemisionesService } from './remisiones.service';
import { CreateRemisionDto, UpdateRemisionDto, ApproveRemisionDto, CompleteRemisionDto } from './dto/remision.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EstadoRemision } from '@prisma/client';

@Controller('remisiones')
@UseGuards(JwtAuthGuard)
export class RemisionesController {
  constructor(private readonly remisionesService: RemisionesService) {}

  // Crear una nueva remisión
  @Post()
  create(@Body() createRemisionDto: CreateRemisionDto) {
    return this.remisionesService.create(createRemisionDto);
  }

  // Listar remisiones con filtros
  @Get()
  findAll(
    @Query('capOrigenId') capOrigenId?: string,
    @Query('ipsDestinoId') ipsDestinoId?: string,
    @Query('estado') estado?: EstadoRemision,
    @Query('prioridad') prioridad?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.remisionesService.findAll({
      capOrigenId,
      ipsDestinoId,
      estado,
      prioridad,
      patientId,
    });
  }

  // Estadísticas de remisiones
  @Get('stats')
  getStats() {
    return this.remisionesService.getStats();
  }

  // Buscar por código
  @Get('codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.remisionesService.findByCodigo(codigo);
  }

  // Buscar IPS cercana para remisión
  @Get('nearest-ips/:capId/:especialidad')
  findNearestIps(
    @Param('capId') capId: string,
    @Param('especialidad') especialidad: string,
  ) {
    return this.remisionesService.findNearestIps(capId, especialidad);
  }

  // Obtener una remisión por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.remisionesService.findOne(id);
  }

  // Actualizar remisión
  @Put(':id')
  update(@Param('id') id: string, @Body() updateRemisionDto: UpdateRemisionDto) {
    return this.remisionesService.update(id, updateRemisionDto);
  }

  // Aprobar remisión
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveRemisionDto) {
    return this.remisionesService.approve(id, dto.notas);
  }

  // Rechazar remisión
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('notas') notas: string) {
    return this.remisionesService.reject(id, notas);
  }

  // Iniciar proceso
  @Post(':id/start')
  startProcess(@Param('id') id: string) {
    return this.remisionesService.startProcess(id);
  }

  // Completar remisión
  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteRemisionDto) {
    return this.remisionesService.complete(id, dto.resultadoAtencion, dto.notas);
  }

  // Cancelar remisión
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body('notas') notas: string) {
    return this.remisionesService.cancel(id, notas);
  }
}
