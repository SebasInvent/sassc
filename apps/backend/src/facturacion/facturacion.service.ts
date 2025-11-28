import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// Códigos de glosa según Decreto 4747/2007
const CODIGOS_GLOSA = {
  G1: 'Factura o documento equivalente con errores',
  G2: 'Servicio no cubierto por el plan de beneficios',
  G3: 'Servicio no autorizado',
  G4: 'Servicio ya cancelado',
  G5: 'Servicio facturado no prestado',
  G6: 'Factura con cobro de copago o cuota moderadora no autorizado',
  G7: 'Servicio facturado con tarifa superior a la pactada',
  G8: 'Usuario no afiliado o no identificado',
  G9: 'Servicio prestado durante período de carencia',
  G10: 'Otra causa de glosa',
};

@Injectable()
export class FacturacionService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CREAR FACTURA
  // ==========================================

  async crearFactura(data: {
    prefijo: string;
    ipsId: string;
    nitEmisor: string;
    razonSocialEmisor: string;
    tipoReceptor: string;
    nitReceptor?: string;
    razonSocialReceptor?: string;
    patientId?: string;
    fechaVencimiento?: Date;
    detalle: any[]; // Array de líneas de factura
  }) {
    // Obtener siguiente número de factura
    const ultimaFactura = await this.prisma.facturaElectronica.findFirst({
      where: { prefijo: data.prefijo },
      orderBy: { numero: 'desc' },
    });

    const numero = (ultimaFactura?.numero || 0) + 1;

    // Calcular totales
    const subtotal = data.detalle.reduce((sum, item) => sum + (item.cantidad * item.valorUnitario), 0);
    const descuento = data.detalle.reduce((sum, item) => sum + (item.descuento || 0), 0);
    const iva = subtotal * 0; // Servicios de salud exentos de IVA
    const total = subtotal - descuento + iva;

    // Generar CUFE (simplificado)
    const cufe = this.generarCUFE(data.prefijo, numero, total, data.nitEmisor);

    return this.prisma.facturaElectronica.create({
      data: {
        prefijo: data.prefijo,
        numero,
        cufe,
        ipsId: data.ipsId,
        nitEmisor: data.nitEmisor,
        razonSocialEmisor: data.razonSocialEmisor,
        tipoReceptor: data.tipoReceptor,
        nitReceptor: data.nitReceptor,
        razonSocialReceptor: data.razonSocialReceptor,
        patientId: data.patientId,
        fechaVencimiento: data.fechaVencimiento,
        subtotal,
        descuento,
        iva,
        total,
        detalle: JSON.stringify(data.detalle),
      },
    });
  }

  // ==========================================
  // GENERAR CUFE
  // ==========================================

  private generarCUFE(prefijo: string, numero: number, total: number, nit: string): string {
    const fecha = new Date().toISOString();
    const data = `${prefijo}${numero}${fecha}${total}${nit}`;
    return crypto.createHash('sha384').update(data).digest('hex');
  }

  // ==========================================
  // ENVIAR A DIAN (Simulado)
  // ==========================================

  async enviarADian(id: string) {
    const factura = await this.prisma.facturaElectronica.findUnique({ where: { id } });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    if (factura.estadoDian !== 'pendiente') {
      throw new BadRequestException('La factura ya fue enviada a la DIAN');
    }

    // Simular envío a DIAN
    const aceptada = Math.random() > 0.1; // 90% de aceptación simulada

    return this.prisma.facturaElectronica.update({
      where: { id },
      data: {
        estadoDian: aceptada ? 'aceptada' : 'rechazada',
        fechaEnvioDian: new Date(),
        respuestaDian: aceptada 
          ? 'Documento validado por la DIAN' 
          : 'Error: Información del emisor incorrecta',
      },
    });
  }

  // ==========================================
  // REGISTRAR GLOSA
  // ==========================================

  async registrarGlosa(facturaId: string, data: {
    codigoGlosa: string;
    descripcion: string;
    valorGlosado: number;
  }) {
    const factura = await this.prisma.facturaElectronica.findUnique({ where: { id: facturaId } });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    // Crear glosa
    const glosa = await this.prisma.glosa.create({
      data: {
        facturaId,
        codigoGlosa: data.codigoGlosa,
        descripcion: data.descripcion || CODIGOS_GLOSA[data.codigoGlosa as keyof typeof CODIGOS_GLOSA] || '',
        valorGlosado: data.valorGlosado,
      },
    });

    // Marcar factura con glosas
    await this.prisma.facturaElectronica.update({
      where: { id: facturaId },
      data: { tieneGlosas: true },
    });

    return glosa;
  }

  // ==========================================
  // RESPONDER GLOSA
  // ==========================================

  async responderGlosa(glosaId: string, data: {
    respuesta: string;
    aceptada: boolean;
    valorAceptado?: number;
  }) {
    return this.prisma.glosa.update({
      where: { id: glosaId },
      data: {
        respuesta: data.respuesta,
        estado: data.aceptada ? 'aceptada' : 'rechazada',
        fechaRespuesta: new Date(),
        valorAceptado: data.aceptada ? data.valorAceptado : 0,
      },
    });
  }

  // ==========================================
  // LISTAR FACTURAS
  // ==========================================

  async listarFacturas(filters?: {
    ipsId?: string;
    estadoDian?: string;
    estadoPago?: string;
    tieneGlosas?: boolean;
  }) {
    const where: any = {};

    if (filters?.ipsId) where.ipsId = filters.ipsId;
    if (filters?.estadoDian) where.estadoDian = filters.estadoDian;
    if (filters?.estadoPago) where.estadoPago = filters.estadoPago;
    if (filters?.tieneGlosas !== undefined) where.tieneGlosas = filters.tieneGlosas;

    return this.prisma.facturaElectronica.findMany({
      where,
      include: {
        glosas: true,
      },
      orderBy: { fechaEmision: 'desc' },
      take: 100,
    });
  }

  // ==========================================
  // REGISTRAR PAGO
  // ==========================================

  async registrarPago(id: string, montoPagado: number) {
    const factura = await this.prisma.facturaElectronica.findUnique({ where: { id } });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    const nuevoEstado = montoPagado >= factura.total ? 'pagada' : 'parcial';

    return this.prisma.facturaElectronica.update({
      where: { id },
      data: { estadoPago: nuevoEstado },
    });
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  async getEstadisticas(ipsId?: string) {
    const where = ipsId ? { ipsId } : {};

    const [
      total,
      porEstadoDian,
      porEstadoPago,
      montoTotal,
      conGlosas,
    ] = await Promise.all([
      this.prisma.facturaElectronica.count({ where }),
      this.prisma.facturaElectronica.groupBy({
        by: ['estadoDian'],
        where,
        _count: true,
      }),
      this.prisma.facturaElectronica.groupBy({
        by: ['estadoPago'],
        where,
        _count: true,
      }),
      this.prisma.facturaElectronica.aggregate({
        where,
        _sum: { total: true },
      }),
      this.prisma.facturaElectronica.count({ where: { ...where, tieneGlosas: true } }),
    ]);

    return {
      total,
      porEstadoDian,
      porEstadoPago,
      montoTotal: montoTotal._sum.total || 0,
      conGlosas,
      codigosGlosa: CODIGOS_GLOSA,
    };
  }
}
