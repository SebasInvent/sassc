import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ImagingService } from './imaging.service';
import { CreateImagingOrderDto } from './dto/create-imaging-order.dto';
import { CreateImagingResultDto } from './dto/create-imaging-result.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/Imaging')
@UseGuards(JwtAuthGuard)
export class ImagingController {
  constructor(private readonly imagingService: ImagingService) {}

  @Post('order')
  createOrder(@Body() createImagingOrderDto: CreateImagingOrderDto) {
    return this.imagingService.createOrder(createImagingOrderDto);
  }

  @Get('orders')
  findAllOrders() {
    return this.imagingService.findAll();
  }

  @Get('orders/pending')
  findPendingOrders() {
    return this.imagingService.findPendingOrders();
  }

  @Get('order/:id')
  findOneOrder(@Param('id') id: string) {
    return this.imagingService.findOne(id);
  }

  @Get('orders/patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.imagingService.findByPatient(patientId);
  }

  @Get('orders/encounter/:encounterId')
  findByEncounter(@Param('encounterId') encounterId: string) {
    return this.imagingService.findByEncounter(encounterId);
  }

  @Patch('order/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.imagingService.updateStatus(id, status);
  }

  @Post('result')
  addResult(@Body() createImagingResultDto: CreateImagingResultDto) {
    return this.imagingService.addResult(createImagingResultDto);
  }

  @Get('results/:orderId')
  getResults(@Param('orderId') orderId: string) {
    return this.imagingService.getResultsByOrder(orderId);
  }
}
