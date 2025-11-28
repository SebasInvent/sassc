import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/MedicationRequest')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPrescriptionDto: CreatePrescriptionDto) {
    return this.medicationsService.createPrescription(createPrescriptionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.medicationsService.findAllPrescriptions();
  }

  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard)
  findByPatient(@Param('patientId') patientId: string) {
    return this.medicationsService.findPrescriptionsByPatient(patientId);
  }

  @Get('encounter/:encounterId')
  @UseGuards(JwtAuthGuard)
  findByEncounter(@Param('encounterId') encounterId: string) {
    return this.medicationsService.findPrescriptionsByEncounter(encounterId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.medicationsService.findOnePrescription(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updatePrescriptionDto: UpdatePrescriptionDto) {
    return this.medicationsService.updatePrescription(id, updatePrescriptionDto);
  }
}
