import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RipsService } from './rips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rips')
@UseGuards(JwtAuthGuard)
export class RipsController {
  constructor(private readonly ripsService: RipsService) {}

  @Post()
  crearRegistro(@Body() data: any) {
    return this.ripsService.crearRegistro({
      ...data,
      fechaServicio: new Date(data.fechaServicio),
    });
  }

  @Post('desde-encuentro/:encounterId')
  generarDesdeEncuentro(
    @Param('encounterId') encounterId: string,
    @Body() data: { ipsId: string; codigoPrestador: string },
  ) {
    return this.ripsService.generarDesdeEncuentro(encounterId, data.ipsId, data.codigoPrestador);
  }

  @Get()
  listarRegistros(
    @Query('tipoArchivo') tipoArchivo?: string,
    @Query('estado') estado?: string,
    @Query('ipsId') ipsId?: string,
    @Query('lote') lote?: string,
  ) {
    return this.ripsService.listarRegistros({ tipoArchivo, estado, ipsId, lote });
  }

  @Post(':id/validar')
  validarRegistro(@Param('id') id: string) {
    return this.ripsService.validarRegistro(id);
  }

  @Post('lote')
  crearLote(@Body() data: { ipsId: string; fechaDesde: string; fechaHasta: string }) {
    return this.ripsService.crearLote(
      data.ipsId,
      new Date(data.fechaDesde),
      new Date(data.fechaHasta),
    );
  }

  @Get('lote/:lote/xml')
  generarXML(@Param('lote') lote: string) {
    return this.ripsService.generarArchivoXML(lote);
  }

  @Get('stats')
  getEstadisticas(@Query('ipsId') ipsId?: string) {
    return this.ripsService.getEstadisticas(ipsId);
  }
}
