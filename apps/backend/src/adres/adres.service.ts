import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateADRESRegionalDto, 
  UpdateADRESRegionalDto, 
  CreatePagoDto, 
  UpdatePagoDto,
  PagosQueryDto 
} from './dto/adres.dto';

@Injectable()
export class AdresService {
  constructor(private prisma: PrismaService) {}

  // ==================== ADRES REGIONAL ====================

  async findAllRegionales() {
    return this.prisma.aDRESRegional.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: {
            caps: true,
            ips: true,
            pagos: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findRegionalById(id: string) {
    const regional = await this.prisma.aDRESRegional.findUnique({
      where: { id },
      include: {
        caps: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
            poblacionAsignada: true,
          },
        },
        ips: {
          select: {
            id: true,
            nombre: true,
            nivelComplejidad: true,
            ciudad: true,
          },
        },
        pagos: {
          take: 10,
          orderBy: { fechaPago: 'desc' },
        },
        _count: {
          select: {
            caps: true,
            ips: true,
            pagos: true,
          },
        },
      },
    });

    if (!regional) {
      throw new NotFoundException('ADRES Regional no encontrada');
    }

    return regional;
  }

  async createRegional(dto: CreateADRESRegionalDto) {
    return this.prisma.aDRESRegional.create({
      data: dto,
    });
  }

  async updateRegional(id: string, dto: UpdateADRESRegionalDto) {
    const regional = await this.prisma.aDRESRegional.findUnique({ where: { id } });
    if (!regional) {
      throw new NotFoundException('ADRES Regional no encontrada');
    }

    return this.prisma.aDRESRegional.update({
      where: { id },
      data: dto,
    });
  }

  // ==================== PAGOS ====================

  async findAllPagos(query: PagosQueryDto) {
    const where: any = {};

    if (query.adresRegionalId) {
      where.adresRegionalId = query.adresRegionalId;
    }
    if (query.ipsDestinoId) {
      where.ipsDestinoId = query.ipsDestinoId;
    }
    if (query.estado) {
      where.estado = query.estado;
    }
    if (query.periodo) {
      where.periodo = query.periodo;
    }
    if (query.fechaDesde || query.fechaHasta) {
      where.fechaPago = {};
      if (query.fechaDesde) {
        where.fechaPago.gte = new Date(query.fechaDesde);
      }
      if (query.fechaHasta) {
        where.fechaPago.lte = new Date(query.fechaHasta);
      }
    }

    return this.prisma.pagoADRES.findMany({
      where,
      include: {
        adresRegional: {
          select: {
            id: true,
            nombre: true,
            departamento: true,
          },
        },
      },
      orderBy: { fechaPago: 'desc' },
    });
  }

  async findPagoById(id: string) {
    const pago = await this.prisma.pagoADRES.findUnique({
      where: { id },
      include: {
        adresRegional: true,
      },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return pago;
  }

  async createPago(dto: CreatePagoDto) {
    // Verificar que la regional existe
    const regional = await this.prisma.aDRESRegional.findUnique({
      where: { id: dto.adresRegionalId },
    });
    if (!regional) {
      throw new BadRequestException('ADRES Regional no encontrada');
    }

    // Verificar que la IPS existe
    const ips = await this.prisma.iPS.findUnique({
      where: { id: dto.ipsDestinoId },
    });
    if (!ips) {
      throw new BadRequestException('IPS destino no encontrada');
    }

    return this.prisma.pagoADRES.create({
      data: {
        ...dto,
        estado: 'pendiente',
      },
      include: {
        adresRegional: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
  }

  async updatePago(id: string, dto: UpdatePagoDto) {
    const pago = await this.prisma.pagoADRES.findUnique({ where: { id } });
    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return this.prisma.pagoADRES.update({
      where: { id },
      data: dto,
    });
  }

  async procesarPago(id: string, estado: 'procesado' | 'rechazado') {
    const pago = await this.prisma.pagoADRES.findUnique({
      where: { id },
      include: { adresRegional: true },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden procesar pagos pendientes');
    }

    // Si se procesa el pago, actualizar el presupuesto ejecutado de la regional
    if (estado === 'procesado') {
      await this.prisma.aDRESRegional.update({
        where: { id: pago.adresRegionalId },
        data: {
          presupuestoEjecutado: {
            increment: pago.monto,
          },
        },
      });
    }

    return this.prisma.pagoADRES.update({
      where: { id },
      data: { estado },
    });
  }

  // ==================== ESTADÍSTICAS ====================

  async getEstadisticasNacionales() {
    // Obtener todas las regionales
    const regionales = await this.prisma.aDRESRegional.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: {
            caps: true,
            ips: true,
          },
        },
      },
    });

    // Calcular totales
    const presupuestoNacional = regionales.reduce(
      (sum, r) => sum + (r.presupuestoAnual || 0),
      0
    );
    const presupuestoEjecutado = regionales.reduce(
      (sum, r) => sum + (r.presupuestoEjecutado || 0),
      0
    );
    const totalCaps = regionales.reduce((sum, r) => sum + r._count.caps, 0);
    const totalIps = regionales.reduce((sum, r) => sum + r._count.ips, 0);

    // Pagos del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const pagosDelMes = await this.prisma.pagoADRES.aggregate({
      where: {
        fechaPago: { gte: inicioMes },
        estado: 'procesado',
      },
      _sum: { monto: true },
      _count: true,
    });

    // Deuda pendiente
    const deudaPendiente = await this.prisma.pagoADRES.aggregate({
      where: { estado: 'pendiente' },
      _sum: { monto: true },
      _count: true,
    });

    // Total de pacientes (para calcular UPC)
    const totalPacientes = await this.prisma.patient.count();

    // UPC promedio (presupuesto / pacientes)
    const upcPromedio = totalPacientes > 0 
      ? presupuestoNacional / totalPacientes 
      : 1200000; // Default 1.2M

    return {
      presupuestoNacional,
      presupuestoEjecutado,
      porcentajeEjecucion: presupuestoNacional > 0 
        ? ((presupuestoEjecutado / presupuestoNacional) * 100).toFixed(1)
        : '0',
      upcPromedio,
      totalAfiliados: totalPacientes,
      totalCaps,
      totalIps,
      pagosDelMes: {
        monto: pagosDelMes._sum.monto || 0,
        cantidad: pagosDelMes._count,
      },
      deudaPendiente: {
        monto: deudaPendiente._sum.monto || 0,
        cantidad: deudaPendiente._count,
      },
      regionales: regionales.map(r => ({
        id: r.id,
        nombre: r.nombre,
        departamento: r.departamento,
        presupuesto: r.presupuestoAnual || 0,
        ejecutado: r.presupuestoEjecutado || 0,
        caps: r._count.caps,
        ips: r._count.ips,
      })),
    };
  }

  async getEstadisticasRegional(id: string) {
    const regional = await this.prisma.aDRESRegional.findUnique({
      where: { id },
      include: {
        caps: {
          select: { id: true, nombre: true, ciudad: true, poblacionAsignada: true },
        },
        ips: {
          select: { id: true, nombre: true, nivelComplejidad: true, ciudad: true },
        },
        pagos: {
          take: 10,
          orderBy: { fechaPago: 'desc' },
        },
        _count: {
          select: { caps: true, ips: true, pagos: true },
        },
      },
    });

    if (!regional) {
      throw new NotFoundException('ADRES Regional no encontrada');
    }

    // Pagos del mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const pagosDelMes = await this.prisma.pagoADRES.aggregate({
      where: {
        adresRegionalId: id,
        fechaPago: { gte: inicioMes },
        estado: 'procesado',
      },
      _sum: { monto: true },
      _count: true,
    });

    const pagosPendientes = await this.prisma.pagoADRES.aggregate({
      where: {
        adresRegionalId: id,
        estado: 'pendiente',
      },
      _sum: { monto: true },
      _count: true,
    });

    // Pacientes en la región (a través de CAPs)
    const capsIds = regional.caps.map((c: { id: string }) => c.id);
    const pacientesRegion = await this.prisma.patient.count({
      where: { capAsignadoId: { in: capsIds } },
    });

    return {
      regional: {
        id: regional.id,
        nombre: regional.nombre,
        departamento: regional.departamento,
        presupuestoAnual: regional.presupuestoAnual,
        presupuestoEjecutado: regional.presupuestoEjecutado,
        director: regional.director,
      },
      estadisticas: {
        totalCaps: regional._count.caps,
        totalIps: regional._count.ips,
        totalPacientes: pacientesRegion,
        pagosDelMes: {
          monto: pagosDelMes._sum.monto || 0,
          cantidad: pagosDelMes._count,
        },
        pagosPendientes: {
          monto: pagosPendientes._sum.monto || 0,
          cantidad: pagosPendientes._count,
        },
      },
      caps: regional.caps,
      ips: regional.ips,
      ultimosPagos: regional.pagos,
    };
  }
}
