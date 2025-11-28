import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { AuthorizationsService } from './authorizations.service';
import { CreateAuthorizationDto } from './dto/create-authorization.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/Authorization')
export class AuthorizationsController {
  constructor(private readonly authorizationsService: AuthorizationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createAuthorizationDto: CreateAuthorizationDto) {
    return this.authorizationsService.create(createAuthorizationDto);
  }

  @Get()
  findAll() {
    return this.authorizationsService.findAll();
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard)
  findPending() {
    return this.authorizationsService.findPending();
  }

  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard)
  findByPatient(@Param('patientId') patientId: string) {
    return this.authorizationsService.findByPatient(patientId);
  }

  @Get('prescription/:prescriptionId')
  @UseGuards(JwtAuthGuard)
  findByPrescription(@Param('prescriptionId') prescriptionId: string) {
    return this.authorizationsService.findByPrescription(prescriptionId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.authorizationsService.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard)
  approve(
    @Param('id') id: string,
    @Body() body: { reviewerId: string; approvedQuantity: number; validUntil: string; notes?: string }
  ) {
    return this.authorizationsService.approve(
      id, 
      body.reviewerId, 
      body.approvedQuantity, 
      new Date(body.validUntil),
      body.notes
    );
  }

  @Patch(':id/deny')
  @UseGuards(JwtAuthGuard)
  deny(
    @Param('id') id: string,
    @Body() body: { reviewerId: string; denialReason: string }
  ) {
    return this.authorizationsService.deny(id, body.reviewerId, body.denialReason);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string }
  ) {
    return this.authorizationsService.cancel(id, body.reason);
  }
}
