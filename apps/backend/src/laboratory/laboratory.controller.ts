import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { LaboratoryService } from './laboratory.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/Laboratory')
@UseGuards(JwtAuthGuard)
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Post('order')
  createOrder(@Body() createLabOrderDto: CreateLabOrderDto) {
    return this.laboratoryService.createOrder(createLabOrderDto);
  }

  @Get('orders')
  findAllOrders() {
    return this.laboratoryService.findAll();
  }

  @Get('orders/pending')
  findPendingOrders() {
    return this.laboratoryService.findPendingOrders();
  }

  @Get('order/:id')
  findOneOrder(@Param('id') id: string) {
    return this.laboratoryService.findOne(id);
  }

  @Get('orders/patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.laboratoryService.findByPatient(patientId);
  }

  @Get('orders/encounter/:encounterId')
  findByEncounter(@Param('encounterId') encounterId: string) {
    return this.laboratoryService.findByEncounter(encounterId);
  }

  @Patch('order/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.laboratoryService.updateStatus(id, status);
  }

  @Post('result')
  addResult(@Body() createLabResultDto: CreateLabResultDto) {
    return this.laboratoryService.addResult(createLabResultDto);
  }

  @Get('results/:orderId')
  getResults(@Param('orderId') orderId: string) {
    return this.laboratoryService.getResultsByOrder(orderId);
  }
}
