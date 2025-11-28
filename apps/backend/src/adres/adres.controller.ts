import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdresService } from './adres.service';
import {
  CreateADRESRegionalDto,
  UpdateADRESRegionalDto,
  CreatePagoDto,
  UpdatePagoDto,
  PagosQueryDto,
  ProcesarPagoDto,
} from './dto/adres.dto';

@Controller('adres')
@UseGuards(JwtAuthGuard)
export class AdresController {
  constructor(private readonly adresService: AdresService) {}

  // ==================== ESTADÍSTICAS ====================

  @Get('estadisticas')
  async getEstadisticasNacionales() {
    return this.adresService.getEstadisticasNacionales();
  }

  @Get('estadisticas/:id')
  async getEstadisticasRegional(@Param('id') id: string) {
    return this.adresService.getEstadisticasRegional(id);
  }

  // ==================== REGIONALES ====================

  @Get('regionales')
  async findAllRegionales() {
    return this.adresService.findAllRegionales();
  }

  @Get('regionales/:id')
  async findRegionalById(@Param('id') id: string) {
    return this.adresService.findRegionalById(id);
  }

  @Post('regionales')
  async createRegional(@Body() dto: CreateADRESRegionalDto) {
    return this.adresService.createRegional(dto);
  }

  @Put('regionales/:id')
  async updateRegional(
    @Param('id') id: string,
    @Body() dto: UpdateADRESRegionalDto,
  ) {
    return this.adresService.updateRegional(id, dto);
  }

  // ==================== PAGOS ====================

  @Get('pagos')
  async findAllPagos(@Query() query: PagosQueryDto) {
    return this.adresService.findAllPagos(query);
  }

  @Get('pagos/:id')
  async findPagoById(@Param('id') id: string) {
    return this.adresService.findPagoById(id);
  }

  @Post('pagos')
  async createPago(@Body() dto: CreatePagoDto) {
    return this.adresService.createPago(dto);
  }

  @Put('pagos/:id')
  async updatePago(@Param('id') id: string, @Body() dto: UpdatePagoDto) {
    return this.adresService.updatePago(id, dto);
  }

  @Patch('pagos/:id/procesar')
  async procesarPago(@Param('id') id: string, @Body() dto: ProcesarPagoDto) {
    return this.adresService.procesarPago(id, dto.estado);
  }
}
