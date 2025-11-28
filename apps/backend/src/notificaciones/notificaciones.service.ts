import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Notificacion {
  id: string;
  tipo: 'alerta' | 'info' | 'exito' | 'advertencia';
  titulo: string;
  mensaje: string;
  entidadTipo?: string;
  entidadId?: string;
  leida: boolean;
  fecha: Date;
  accion?: string;
}

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // GENERAR NOTIFICACIONES DEL SISTEMA
  // ==========================================

  async getNotificacionesUsuario(userId: string): Promise<Notificacion[]> {
    const notificaciones: Notificacion[] = [];
    const ahora = new Date();

    // 1. Controles preventivos vencidos
    const controlesVencidos = await this.prisma.seguimientoPreventivo.findMany({
      where: {
        estado: 'pendiente',
        fechaProgramada: { lt: ahora },
      },
      include: {
        programa: { select: { nombre: true } },
      },
      take: 5,
    });

    controlesVencidos.forEach(control => {
      notificaciones.push({
        id: `prev-${control.id}`,
        tipo: 'alerta',
        titulo: 'Control Vencido',
        mensaje: `${control.programa.nombre} - Paciente pendiente`,
        entidadTipo: 'SeguimientoPreventivo',
        entidadId: control.id,
        leida: false,
        fecha: control.fechaProgramada,
        accion: '/dashboard/preventivo',
      });
    });

    // 2. Pagos pendientes de aprobar
    const pagosPendientes = await this.prisma.pagoADRES.findMany({
      where: { estado: 'pendiente' },
      include: {
        adresRegional: { select: { nombre: true } },
      },
      take: 5,
    });

    pagosPendientes.forEach(pago => {
      notificaciones.push({
        id: `pago-${pago.id}`,
        tipo: 'advertencia',
        titulo: 'Pago Pendiente',
        mensaje: `$${pago.monto.toLocaleString()} - ${pago.concepto}`,
        entidadTipo: 'PagoADRES',
        entidadId: pago.id,
        leida: false,
        fecha: pago.createdAt,
        accion: '/dashboard/financiero',
      });
    });

    // 3. Remisiones en proceso
    const remisionesEnProceso = await this.prisma.remision.findMany({
      where: { estado: 'EN_PROCESO' },
      include: {
        capOrigen: { select: { nombre: true } },
        ipsDestino: { select: { nombre: true } },
      },
      take: 5,
    });

    remisionesEnProceso.forEach(remision => {
      notificaciones.push({
        id: `rem-${remision.id}`,
        tipo: 'info',
        titulo: 'Remisión en Proceso',
        mensaje: `${remision.capOrigen.nombre} → ${remision.ipsDestino.nombre}`,
        entidadTipo: 'Remision',
        entidadId: remision.id,
        leida: false,
        fecha: remision.createdAt,
        accion: `/dashboard/remisiones/${remision.id}`,
      });
    });

    // 4. Controles próximos (próximos 3 días)
    const en3Dias = new Date(ahora);
    en3Dias.setDate(en3Dias.getDate() + 3);

    const controlesProximos = await this.prisma.seguimientoPreventivo.findMany({
      where: {
        estado: 'pendiente',
        fechaProgramada: {
          gte: ahora,
          lte: en3Dias,
        },
      },
      include: {
        programa: { select: { nombre: true } },
      },
      take: 5,
    });

    controlesProximos.forEach(control => {
      notificaciones.push({
        id: `prox-${control.id}`,
        tipo: 'info',
        titulo: 'Control Próximo',
        mensaje: `${control.programa.nombre} - En ${Math.ceil((control.fechaProgramada.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))} días`,
        entidadTipo: 'SeguimientoPreventivo',
        entidadId: control.id,
        leida: false,
        fecha: control.fechaProgramada,
        accion: '/dashboard/preventivo',
      });
    });

    // Ordenar por fecha (más recientes primero)
    return notificaciones.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  // ==========================================
  // RESUMEN DE ALERTAS
  // ==========================================

  async getResumenAlertas() {
    const ahora = new Date();

    const [
      controlesVencidos,
      pagosPendientes,
      remisionesEnProceso,
      firmasHoy,
    ] = await Promise.all([
      this.prisma.seguimientoPreventivo.count({
        where: {
          estado: 'pendiente',
          fechaProgramada: { lt: ahora },
        },
      }),
      this.prisma.pagoADRES.count({
        where: { estado: 'pendiente' },
      }),
      this.prisma.remision.count({
        where: { estado: 'EN_PROCESO' },
      }),
      this.prisma.firmaBiometrica.count({
        where: {
          fechaFirma: {
            gte: new Date(ahora.setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      controlesVencidos,
      pagosPendientes,
      remisionesEnProceso,
      firmasHoy,
      totalAlertas: controlesVencidos + pagosPendientes,
    };
  }

  // ==========================================
  // MARCAR COMO LEÍDA (simulado)
  // ==========================================

  async marcarLeida(notificacionId: string) {
    // En una implementación real, esto actualizaría una tabla de notificaciones
    return { success: true, id: notificacionId };
  }

  async marcarTodasLeidas(userId: string) {
    return { success: true, userId };
  }
}
