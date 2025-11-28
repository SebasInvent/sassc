import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IpsService } from './ips.service';
import { CreateIpsDto, UpdateIpsDto, AssignPersonalIpsDto } from './dto/ips.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NivelComplejidad } from '@prisma/client';

@Controller('ips')
@UseGuards(JwtAuthGuard)
export class IpsController {
  constructor(private readonly ipsService: IpsService) {}

  // Listar todas las IPS
  @Get()
  findAll(
    @Query('ciudad') ciudad?: string,
    @Query('departamento') departamento?: string,
    @Query('nivelComplejidad') nivelComplejidad?: NivelComplejidad,
    @Query('tipo') tipo?: string,
    @Query('activo') activo?: string,
  ) {
    return this.ipsService.findAll({
      ciudad,
      departamento,
      nivelComplejidad,
      tipo,
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
    });
  }

  // Estadísticas generales
  @Get('stats')
  getGeneralStats() {
    return this.ipsService.getGeneralStats();
  }

  // Buscar por especialidad
  @Get('by-especialidad/:especialidad')
  findByEspecialidad(
    @Param('especialidad') especialidad: string,
    @Query('ciudad') ciudad?: string,
    @Query('departamento') departamento?: string,
  ) {
    return this.ipsService.findByEspecialidad(especialidad, ciudad, departamento);
  }

  // Obtener una IPS por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ipsService.findOne(id);
  }

  // Estadísticas de una IPS específica
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.ipsService.getStats(id);
  }

  // Crear una nueva IPS
  @Post()
  create(@Body() createIpsDto: CreateIpsDto) {
    return this.ipsService.create(createIpsDto);
  }

  // Actualizar una IPS
  @Put(':id')
  update(@Param('id') id: string, @Body() updateIpsDto: UpdateIpsDto) {
    return this.ipsService.update(id, updateIpsDto);
  }

  // Eliminar una IPS
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ipsService.remove(id);
  }

  // Asignar personal a una IPS
  @Post(':id/personal')
  assignPersonal(@Param('id') id: string, @Body() dto: AssignPersonalIpsDto) {
    return this.ipsService.assignPersonal(id, dto.practitionerId, dto.cargo, dto.especialidad, dto.esDirector);
  }

  // Remover personal de una IPS
  @Delete(':id/personal/:practitionerId')
  removePersonal(@Param('id') id: string, @Param('practitionerId') practitionerId: string) {
    return this.ipsService.removePersonal(id, practitionerId);
  }
}
