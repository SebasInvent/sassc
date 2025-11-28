import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancieroService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // GIROS DIRECTOS ADRES → IPS
  // ==========================================

  async crearGiro(data: {
    adresRegionalId: string;
    ipsDestinoId: string;
    concepto: string;
    monto: number;
    numeroFactura?: string;
    periodo?: string;
    firmaBiometricaId?: string;
  }) {
    // Verificar que ADRES existe
    const adres = await this.prisma.aDRESRegional.findUnique({
      where: { id: data.adresRegionalId },
    });
    if (!adres) throw new NotFoundException('ADRES Regional no encontrada');

    // Verificar que IPS existe
    const ips = await this.prisma.iPS.findUnique({
      where: { id: data.ipsDestinoId },
    });
    if (!ips) throw new NotFoundException('IPS no encontrada');

    // Crear el giro
    const giro = await this.prisma.pagoADRES.create({
      data: {
        adresRegionalId: data.adresRegionalId,
        ipsDestinoId: data.ipsDestinoId,
        concepto: data.concepto,
        monto: data.monto,
        numeroFactura: data.numeroFactura,
        periodo: data.periodo,
        estado: 'pendiente',
      },
    });

    // Actualizar presupuesto ejecutado de ADRES
    await this.prisma.aDRESRegional.update({
      where: { id: data.adresRegionalId },
      data: {
        presupuestoEjecutado: {
          increment: data.monto,
        },
      },
    });

    return giro;
  }

  async aprobarGiro(id: string, aprobadorId: string) {
    const giro = await this.prisma.pagoADRES.findUnique({
      where: { id },
    });

    if (!giro) throw new NotFoundException('Giro no encontrado');
    if (giro.estado !== 'pendiente') {
      throw new BadRequestException('El giro ya fue procesado');
    }

    return this.prisma.pagoADRES.update({
      where: { id },
      data: {
        estado: 'procesado',
        fechaPago: new Date(),
      },
    });
  }

  async rechazarGiro(id: string, motivo: string) {
    const giro = await this.prisma.pagoADRES.findUnique({
      where: { id },
    });

    if (!giro) throw new NotFoundException('Giro no encontrado');

    return this.prisma.pagoADRES.update({
      where: { id },
      data: {
        estado: 'rechazado',
      },
    });
  }

  async listarGiros(filters?: {
    adresRegionalId?: string;
    ipsDestinoId?: string;
    estado?: string;
    periodo?: string;
  }) {
    const where: any = {};

    if (filters?.adresRegionalId) where.adresRegionalId = filters.adresRegionalId;
    if (filters?.ipsDestinoId) where.ipsDestinoId = filters.ipsDestinoId;
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.periodo) where.periodo = filters.periodo;

    return this.prisma.pagoADRES.findMany({
      where,
      include: {
        adresRegional: {
          select: { nombre: true, departamento: true },
        },
      },
      orderBy: { fechaPago: 'desc' },
    });
  }

  async obtenerGiro(id: string) {
    const giro = await this.prisma.pagoADRES.findUnique({
      where: { id },
      include: {
        adresRegional: true,
      },
    });

    if (!giro) throw new NotFoundException('Giro no encontrado');

    // Obtener info de la IPS
    const ips = await this.prisma.iPS.findUnique({
      where: { id: giro.ipsDestinoId },
    });

    return { ...giro, ipsDestino: ips };
  }

  // ==========================================
  // ESTADÍSTICAS FINANCIERAS
  // ==========================================

  async getEstadisticasGenerales() {
    const [
      totalGiros,
      girosPendientes,
      girosAprobados,
      girosRechazados,
      montoTotalGirado,
      montoPendiente,
    ] = await Promise.all([
      this.prisma.pagoADRES.count(),
      this.prisma.pagoADRES.count({ where: { estado: 'pendiente' } }),
      this.prisma.pagoADRES.count({ where: { estado: 'procesado' } }),
      this.prisma.pagoADRES.count({ where: { estado: 'rechazado' } }),
      this.prisma.pagoADRES.aggregate({
        where: { estado: 'procesado' },
        _sum: { monto: true },
      }),
      this.prisma.pagoADRES.aggregate({
        where: { estado: 'pendiente' },
        _sum: { monto: true },
      }),
    ]);

    // Obtener deuda por IPS (simulado - en producción vendría de facturas)
    const ipsList = await this.prisma.iPS.findMany({
      select: { id: true, nombre: true, ciudad: true },
    });

    // Calcular pagos por IPS
    const pagosPorIps = await this.prisma.pagoADRES.groupBy({
      by: ['ipsDestinoId'],
      where: { estado: 'procesado' },
      _sum: { monto: true },
      _count: true,
    });

    const ipsConPagos = ipsList.map(ips => {
      const pagos = pagosPorIps.find(p => p.ipsDestinoId === ips.id);
      return {
        ...ips,
        totalRecibido: pagos?._sum?.monto || 0,
        cantidadGiros: pagos?._count || 0,
      };
    });

    return {
      resumen: {
        totalGiros,
        girosPendientes,
        girosAprobados,
        girosRechazados,
        montoTotalGirado: montoTotalGirado._sum.monto || 0,
        montoPendiente: montoPendiente._sum.monto || 0,
      },
      ipsPorPagos: ipsConPagos.sort((a, b) => b.totalRecibido - a.totalRecibido).slice(0, 10),
    };
  }

  async getEstadisticasPorAdres(adresRegionalId: string) {
    const adres = await this.prisma.aDRESRegional.findUnique({
      where: { id: adresRegionalId },
    });

    if (!adres) throw new NotFoundException('ADRES Regional no encontrada');

    const [totalGiros, montoGirado, girosPorEstado] = await Promise.all([
      this.prisma.pagoADRES.count({ where: { adresRegionalId } }),
      this.prisma.pagoADRES.aggregate({
        where: { adresRegionalId, estado: 'procesado' },
        _sum: { monto: true },
      }),
      this.prisma.pagoADRES.groupBy({
        by: ['estado'],
        where: { adresRegionalId },
        _count: true,
        _sum: { monto: true },
      }),
    ]);

    const presupuestoDisponible = (adres.presupuestoAnual || 0) - (adres.presupuestoEjecutado || 0);
    const porcentajeEjecutado = adres.presupuestoAnual 
      ? ((adres.presupuestoEjecutado || 0) / adres.presupuestoAnual) * 100 
      : 0;

    return {
      adres,
      presupuesto: {
        anual: adres.presupuestoAnual || 0,
        ejecutado: adres.presupuestoEjecutado || 0,
        disponible: presupuestoDisponible,
        porcentajeEjecutado: Math.round(porcentajeEjecutado * 100) / 100,
      },
      giros: {
        total: totalGiros,
        montoGirado: montoGirado._sum.monto || 0,
        porEstado: girosPorEstado,
      },
    };
  }

  // ==========================================
  // ADRES REGIONALES
  // ==========================================

  async listarAdresRegionales() {
    return this.prisma.aDRESRegional.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: { caps: true, ips: true, pagos: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerAdresRegional(id: string) {
    const adres = await this.prisma.aDRESRegional.findUnique({
      where: { id },
      include: {
        caps: { select: { id: true, nombre: true, ciudad: true } },
        ips: { select: { id: true, nombre: true, ciudad: true, nivelComplejidad: true } },
        pagos: {
          take: 10,
          orderBy: { fechaPago: 'desc' },
        },
      },
    });

    if (!adres) throw new NotFoundException('ADRES Regional no encontrada');
    return adres;
  }
}
