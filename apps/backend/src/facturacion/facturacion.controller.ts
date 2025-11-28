import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FacturacionService } from './facturacion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('facturacion')
@UseGuards(JwtAuthGuard)
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Post()
  crearFactura(@Body() data: any) {
    return this.facturacionService.crearFactura({
      ...data,
      fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : undefined,
    });
  }

  @Post(':id/enviar-dian')
  enviarADian(@Param('id') id: string) {
    return this.facturacionService.enviarADian(id);
  }

  @Post(':id/glosa')
  registrarGlosa(@Param('id') id: string, @Body() data: any) {
    return this.facturacionService.registrarGlosa(id, data);
  }

  @Put('glosa/:glosaId/responder')
  responderGlosa(@Param('glosaId') glosaId: string, @Body() data: any) {
    return this.facturacionService.responderGlosa(glosaId, data);
  }

  @Put(':id/pago')
  registrarPago(@Param('id') id: string, @Body('montoPagado') montoPagado: number) {
    return this.facturacionService.registrarPago(id, montoPagado);
  }

  @Get()
  listarFacturas(
    @Query('ipsId') ipsId?: string,
    @Query('estadoDian') estadoDian?: string,
    @Query('estadoPago') estadoPago?: string,
    @Query('tieneGlosas') tieneGlosas?: string,
  ) {
    return this.facturacionService.listarFacturas({
      ipsId,
      estadoDian,
      estadoPago,
      tieneGlosas: tieneGlosas ? tieneGlosas === 'true' : undefined,
    });
  }

  @Get('stats')
  getEstadisticas(@Query('ipsId') ipsId?: string) {
    return this.facturacionService.getEstadisticas(ipsId);
  }
}
