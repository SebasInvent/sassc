import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  async getNotificaciones(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id || 'default';
    return this.notificacionesService.getNotificacionesUsuario(userId);
  }

  @Get('resumen')
  async getResumen() {
    return this.notificacionesService.getResumenAlertas();
  }

  @Post(':id/leer')
  async marcarLeida(@Param('id') id: string) {
    return this.notificacionesService.marcarLeida(id);
  }

  @Post('leer-todas')
  async marcarTodasLeidas(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id || 'default';
    return this.notificacionesService.marcarTodasLeidas(userId);
  }
}
