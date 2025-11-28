import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DispensationsService } from './dispensations.service';
import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/MedicationDispense')
export class DispensationsController {
  constructor(private readonly dispensationsService: DispensationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDispensationDto: CreateDispensationDto) {
    return this.dispensationsService.create(createDispensationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.dispensationsService.findAll();
  }

  @Get('prescription/:prescriptionId')
  @UseGuards(JwtAuthGuard)
  findByPrescription(@Param('prescriptionId') prescriptionId: string) {
    return this.dispensationsService.findByPrescription(prescriptionId);
  }

  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard)
  findByPatient(@Param('patientId') patientId: string) {
    return this.dispensationsService.findByPatient(patientId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.dispensationsService.findOne(id);
  }
}
