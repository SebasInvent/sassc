import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { FirmaBiometricaService } from './firma-biometrica.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('firma-biometrica')
@UseGuards(JwtAuthGuard)
export class FirmaBiometricaController {
  constructor(private readonly firmaBiometricaService: FirmaBiometricaService) {}

  // ==========================================
  // FIRMAR PAGO
  // ==========================================

  @Post('firmar-pago/:pagoId')
  async firmarPago(
    @Param('pagoId') pagoId: string,
    @Body() data: {
      practitionerId: string;
      confianza: number;
      descriptorFacial?: string;
    },
    @Req() req: any,
  ) {
    return this.firmaBiometricaService.firmarPago(
      pagoId,
      data.practitionerId,
      data.confianza,
      data.descriptorFacial,
    );
  }

  // ==========================================
  // CREAR FIRMA GENÉRICA
  // ==========================================

  @Post()
  async crearFirma(
    @Body() data: {
      practitionerId: string;
      tipoAccion: string;
      entidadTipo: string;
      entidadId: string;
      descriptorFacial?: string;
      confianza?: number;
    },
    @Req() req: any,
  ) {
    return this.firmaBiometricaService.crearFirma({
      ...data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==========================================
  // VERIFICAR FIRMA
  // ==========================================

  @Get('verificar/:id')
  verificarFirma(@Param('id') id: string) {
    return this.firmaBiometricaService.verificarFirma(id);
  }

  // ==========================================
  // HISTORIAL
  // ==========================================

  @Get('historial')
  obtenerHistorial(
    @Query('practitionerId') practitionerId?: string,
    @Query('tipoAccion') tipoAccion?: string,
    @Query('entidadTipo') entidadTipo?: string,
  ) {
    return this.firmaBiometricaService.obtenerHistorial({
      practitionerId,
      tipoAccion,
      entidadTipo,
    });
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  @Get('stats')
  getEstadisticas() {
    return this.firmaBiometricaService.getEstadisticas();
  }

  // ==========================================
  // AUDITORÍA DE ENTIDAD
  // ==========================================

  @Get('entidad/:tipo/:id')
  obtenerFirmasDeEntidad(
    @Param('tipo') tipo: string,
    @Param('id') id: string,
  ) {
    return this.firmaBiometricaService.obtenerFirmasDeEntidad(tipo, id);
  }
}
