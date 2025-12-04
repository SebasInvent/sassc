import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Query, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PatientsService, RegisterWithBiometricDto } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ScopesGuard } from '../auth/scopes.guard';
import { Scopes } from '../auth/scopes.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/Patient')
export class PatientsController {
  private readonly logger = new Logger(PatientsController.name);
  
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('search') search?: string) {
    return this.patientsService.findAll(search);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.patientsService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updatePatientDto: Partial<CreatePatientDto>) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }

  // Asignar CAP a paciente
  @Post(':id/assign-cap/:capId')
  @UseGuards(JwtAuthGuard)
  assignCAP(@Param('id') id: string, @Param('capId') capId: string) {
    return this.patientsService.assignCAP(id, capId);
  }

  // Buscar CAP más cercano
  @Get('nearest-cap/:city/:department')
  @UseGuards(JwtAuthGuard)
  findNearestCAP(@Param('city') city: string, @Param('department') department: string) {
    return this.patientsService.findNearestCAP(city, department);
  }

  // ============ REGISTRO BIOMÉTRICO (SIN AUTH PARA KIOSKO) ============
  
  // Registro con biometría facial - endpoint público para kiosko
  @Post('register-biometric')
  async registerWithBiometric(@Body() data: RegisterWithBiometricDto) {
    this.logger.log(`📝 Registro biométrico recibido: ${data.docNumber}`);
    return this.patientsService.registerWithBiometric(data);
  }

  // Buscar paciente por documento - endpoint público para verificación
  @Get('by-doc/:docNumber')
  async findByDocNumber(@Param('docNumber') docNumber: string) {
    return this.patientsService.findByDocNumber(docNumber);
  }
}