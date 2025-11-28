import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CapsService } from './caps.service';
import { CreateCapDto, UpdateCapDto, AssignPersonalDto } from './dto/cap.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('caps')
@UseGuards(JwtAuthGuard)
export class CapsController {
  constructor(private readonly capsService: CapsService) {}

  // Listar todos los CAPs
  @Get()
  findAll(
    @Query('ciudad') ciudad?: string,
    @Query('departamento') departamento?: string,
    @Query('activo') activo?: string,
  ) {
    return this.capsService.findAll({
      ciudad,
      departamento,
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
    });
  }

  // Estadísticas generales
  @Get('stats')
  getGeneralStats() {
    return this.capsService.getGeneralStats();
  }

  // Obtener un CAP por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.capsService.findOne(id);
  }

  // Estadísticas de un CAP específico
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.capsService.getStats(id);
  }

  // Crear un nuevo CAP
  @Post()
  create(@Body() createCapDto: CreateCapDto) {
    return this.capsService.create(createCapDto);
  }

  // Actualizar un CAP
  @Put(':id')
  update(@Param('id') id: string, @Body() updateCapDto: UpdateCapDto) {
    return this.capsService.update(id, updateCapDto);
  }

  // Eliminar un CAP
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.capsService.remove(id);
  }

  // Asignar personal a un CAP
  @Post(':id/personal')
  assignPersonal(@Param('id') id: string, @Body() dto: AssignPersonalDto) {
    return this.capsService.assignPersonal(id, dto.practitionerId, dto.cargo, dto.esDirector);
  }

  // Remover personal de un CAP
  @Delete(':id/personal/:practitionerId')
  removePersonal(@Param('id') id: string, @Param('practitionerId') practitionerId: string) {
    return this.capsService.removePersonal(id, practitionerId);
  }
}
