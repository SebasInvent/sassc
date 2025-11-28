import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FirmaBiometricaService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CREAR FIRMA BIOMÉTRICA
  // ==========================================

  async crearFirma(data: {
    practitionerId: string;
    tipoAccion: string;
    entidadTipo: string;
    entidadId: string;
    descriptorFacial?: string;
    confianza?: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Verificar que el practitioner existe
    const practitioner = await this.prisma.practitioner.findUnique({
      where: { id: data.practitionerId },
    });

    if (!practitioner) {
      throw new NotFoundException('Profesional no encontrado');
    }

    // Crear la firma
    const firma = await this.prisma.firmaBiometrica.create({
      data: {
        practitionerId: data.practitionerId,
        tipoAccion: data.tipoAccion,
        entidadTipo: data.entidadTipo,
        entidadId: data.entidadId,
        descriptorFacial: data.descriptorFacial,
        confianza: data.confianza,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      include: {
        practitioner: {
          select: { firstName: true, lastName: true, license: true, specialty: true },
        },
      },
    });

    return firma;
  }

  // ==========================================
  // FIRMAR Y APROBAR PAGO
  // ==========================================

  async firmarPago(pagoId: string, practitionerId: string, confianza: number, descriptorFacial?: string) {
    // Verificar que el pago existe y está pendiente
    const pago = await this.prisma.pagoADRES.findUnique({
      where: { id: pagoId },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.estado !== 'pendiente') {
      throw new BadRequestException('El pago ya fue procesado');
    }

    // Verificar confianza mínima (80%)
    if (confianza < 80) {
      throw new UnauthorizedException('Confianza de reconocimiento facial insuficiente');
    }

    // Crear la firma biométrica
    const firma = await this.crearFirma({
      practitionerId,
      tipoAccion: 'APROBACION_PAGO',
      entidadTipo: 'PagoADRES',
      entidadId: pagoId,
      descriptorFacial,
      confianza,
    });

    // Actualizar el pago con la firma y aprobar
    const pagoActualizado = await this.prisma.pagoADRES.update({
      where: { id: pagoId },
      data: {
        estado: 'procesado',
        firmaBiometricaId: firma.id,
        fechaPago: new Date(),
      },
      include: {
        adresRegional: true,
        firmaBiometrica: {
          include: {
            practitioner: {
              select: { firstName: true, lastName: true, license: true },
            },
          },
        },
      },
    });

    return {
      pago: pagoActualizado,
      firma,
      mensaje: 'Pago aprobado con firma biométrica',
    };
  }

  // ==========================================
  // VERIFICAR FIRMA
  // ==========================================

  async verificarFirma(firmaId: string) {
    const firma = await this.prisma.firmaBiometrica.findUnique({
      where: { id: firmaId },
      include: {
        practitioner: {
          select: { firstName: true, lastName: true, license: true, specialty: true },
        },
      },
    });

    if (!firma) {
      throw new NotFoundException('Firma no encontrada');
    }

    return {
      firma,
      valida: firma.confianza && firma.confianza >= 80,
      mensaje: firma.confianza && firma.confianza >= 80 
        ? 'Firma biométrica válida' 
        : 'Firma con confianza insuficiente',
    };
  }

  // ==========================================
  // HISTORIAL DE FIRMAS
  // ==========================================

  async obtenerHistorial(filters?: {
    practitionerId?: string;
    tipoAccion?: string;
    entidadTipo?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }) {
    const where: any = {};

    if (filters?.practitionerId) where.practitionerId = filters.practitionerId;
    if (filters?.tipoAccion) where.tipoAccion = filters.tipoAccion;
    if (filters?.entidadTipo) where.entidadTipo = filters.entidadTipo;
    
    if (filters?.fechaDesde || filters?.fechaHasta) {
      where.fechaFirma = {};
      if (filters.fechaDesde) where.fechaFirma.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaFirma.lte = filters.fechaHasta;
    }

    return this.prisma.firmaBiometrica.findMany({
      where,
      include: {
        practitioner: {
          select: { firstName: true, lastName: true, license: true, specialty: true },
        },
      },
      orderBy: { fechaFirma: 'desc' },
      take: 100,
    });
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  async getEstadisticas() {
    const [
      totalFirmas,
      firmasHoy,
      porTipoAccion,
      porPractitioner,
    ] = await Promise.all([
      this.prisma.firmaBiometrica.count(),
      this.prisma.firmaBiometrica.count({
        where: {
          fechaFirma: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.firmaBiometrica.groupBy({
        by: ['tipoAccion'],
        _count: true,
      }),
      this.prisma.firmaBiometrica.groupBy({
        by: ['practitionerId'],
        _count: true,
        orderBy: { _count: { practitionerId: 'desc' } },
        take: 10,
      }),
    ]);

    // Obtener nombres de practitioners
    const practitionerIds = porPractitioner.map(p => p.practitionerId);
    const practitioners = await this.prisma.practitioner.findMany({
      where: { id: { in: practitionerIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const practitionersMap = new Map(practitioners.map(p => [p.id, p]));

    return {
      totalFirmas,
      firmasHoy,
      porTipoAccion,
      topFirmantes: porPractitioner.map(p => ({
        practitioner: practitionersMap.get(p.practitionerId),
        cantidad: p._count,
      })),
    };
  }

  // ==========================================
  // AUDITORÍA DE ENTIDAD
  // ==========================================

  async obtenerFirmasDeEntidad(entidadTipo: string, entidadId: string) {
    return this.prisma.firmaBiometrica.findMany({
      where: {
        entidadTipo,
        entidadId,
      },
      include: {
        practitioner: {
          select: { firstName: true, lastName: true, license: true, specialty: true },
        },
      },
      orderBy: { fechaFirma: 'asc' },
    });
  }
}
