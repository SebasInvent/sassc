import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Códigos CUPS más comunes
const CUPS_CONSULTAS = {
  '890201': 'Consulta de primera vez por medicina general',
  '890301': 'Consulta de control por medicina general',
  '890202': 'Consulta de primera vez por medicina especializada',
  '890302': 'Consulta de control por medicina especializada',
  '890203': 'Consulta de primera vez por odontología general',
  '890303': 'Consulta de control por odontología general',
};

// Finalidades de consulta
const FINALIDADES = {
  '01': 'Atención del parto',
  '02': 'Atención del recién nacido',
  '03': 'Atención en planificación familiar',
  '04': 'Detección de alteraciones de crecimiento y desarrollo',
  '05': 'Detección de alteraciones del embarazo',
  '06': 'Detección de alteraciones del adulto',
  '07': 'Detección de alteraciones de agudeza visual',
  '08': 'Detección de enfermedad profesional',
  '09': 'No aplica',
  '10': 'Otra',
};

// Causas externas
const CAUSAS_EXTERNAS = {
  '01': 'Accidente de trabajo',
  '02': 'Accidente de tránsito',
  '03': 'Accidente rábico',
  '04': 'Accidente ofídico',
  '05': 'Otro tipo de accidente',
  '06': 'Evento catastrófico',
  '07': 'Lesión por agresión',
  '08': 'Lesión auto infligida',
  '09': 'Sospecha de maltrato físico',
  '10': 'Sospecha de abuso sexual',
  '11': 'Sospecha de violencia sexual',
  '12': 'Sospecha de maltrato emocional',
  '13': 'Enfermedad general',
  '14': 'Enfermedad profesional',
  '15': 'Otra',
};

@Injectable()
export class RipsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CREAR REGISTRO RIPS
  // ==========================================

  async crearRegistro(data: {
    tipoArchivo: string;
    codigoPrestador: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaServicio: Date;
    codigoServicio: string;
    cantidad?: number;
    valorUnitario: number;
    diagnosticoPrincipal: string;
    diagnosticoRelacionado1?: string;
    diagnosticoRelacionado2?: string;
    diagnosticoRelacionado3?: string;
    finalidadConsulta?: string;
    causaExterna?: string;
    tipoDiagnostico?: string;
    patientId: string;
    encounterId?: string;
    ipsId: string;
  }) {
    const valorTotal = (data.cantidad || 1) * data.valorUnitario;

    return this.prisma.rIPS.create({
      data: {
        ...data,
        cantidad: data.cantidad || 1,
        valorTotal,
      },
    });
  }

  // ==========================================
  // GENERAR RIPS DESDE ENCUENTRO
  // ==========================================

  async generarDesdeEncuentro(encounterId: string, ipsId: string, codigoPrestador: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: true,
        observations: true,
        conditions: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException('Encuentro no encontrado');
    }

    // Obtener diagnóstico principal de conditions
    const diagnosticoPrincipal = encounter.conditions[0]?.code || 'Z000'; // Z000 = Examen general

    // Crear registro RIPS tipo AC (Consulta)
    const rips = await this.crearRegistro({
      tipoArchivo: 'AC',
      codigoPrestador,
      tipoDocumento: encounter.patient.docType,
      numeroDocumento: encounter.patient.docNumber,
      fechaServicio: encounter.start || new Date(),
      codigoServicio: '890201', // Consulta medicina general
      valorUnitario: 50000, // Valor base consulta
      diagnosticoPrincipal,
      diagnosticoRelacionado1: encounter.conditions[1]?.code,
      finalidadConsulta: '06', // Detección alteraciones adulto
      causaExterna: '13', // Enfermedad general
      tipoDiagnostico: '1', // Impresión diagnóstica
      patientId: encounter.patientId,
      encounterId,
      ipsId,
    });

    return rips;
  }

  // ==========================================
  // LISTAR REGISTROS
  // ==========================================

  async listarRegistros(filters?: {
    tipoArchivo?: string;
    estado?: string;
    ipsId?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
    lote?: string;
  }) {
    const where: any = {};

    if (filters?.tipoArchivo) where.tipoArchivo = filters.tipoArchivo;
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.ipsId) where.ipsId = filters.ipsId;
    if (filters?.lote) where.lote = filters.lote;

    if (filters?.fechaDesde || filters?.fechaHasta) {
      where.fechaServicio = {};
      if (filters.fechaDesde) where.fechaServicio.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaServicio.lte = filters.fechaHasta;
    }

    return this.prisma.rIPS.findMany({
      where,
      orderBy: { fechaServicio: 'desc' },
      take: 500,
    });
  }

  // ==========================================
  // VALIDAR REGISTRO
  // ==========================================

  async validarRegistro(id: string) {
    const rips = await this.prisma.rIPS.findUnique({ where: { id } });
    if (!rips) throw new NotFoundException('Registro no encontrado');

    const errores: string[] = [];

    // Validaciones según normativa
    if (!rips.diagnosticoPrincipal) errores.push('Diagnóstico principal requerido');
    if (!rips.codigoServicio) errores.push('Código CUPS requerido');
    if (rips.valorTotal <= 0) errores.push('Valor debe ser mayor a 0');

    // Validar formato CIE-10
    if (rips.diagnosticoPrincipal && !/^[A-Z]\d{2,3}/.test(rips.diagnosticoPrincipal)) {
      errores.push('Diagnóstico principal no tiene formato CIE-10 válido');
    }

    if (errores.length > 0) {
      return { valido: false, errores };
    }

    // Marcar como validado
    await this.prisma.rIPS.update({
      where: { id },
      data: { estado: 'validado' },
    });

    return { valido: true, errores: [] };
  }

  // ==========================================
  // CREAR LOTE PARA ENVÍO
  // ==========================================

  async crearLote(ipsId: string, fechaDesde: Date, fechaHasta: Date) {
    const numeroLote = `RIPS-${Date.now()}`;

    // Obtener registros validados sin lote
    const registros = await this.prisma.rIPS.findMany({
      where: {
        ipsId,
        estado: 'validado',
        lote: null,
        fechaServicio: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
    });

    if (registros.length === 0) {
      throw new BadRequestException('No hay registros validados para incluir en el lote');
    }

    // Asignar lote a los registros
    await this.prisma.rIPS.updateMany({
      where: { id: { in: registros.map(r => r.id) } },
      data: { lote: numeroLote },
    });

    return {
      numeroLote,
      cantidadRegistros: registros.length,
      fechaDesde,
      fechaHasta,
    };
  }

  // ==========================================
  // GENERAR ARCHIVO XML RIPS
  // ==========================================

  async generarArchivoXML(lote: string) {
    const registros = await this.prisma.rIPS.findMany({
      where: { lote },
      orderBy: { tipoArchivo: 'asc' },
    });

    if (registros.length === 0) {
      throw new NotFoundException('Lote no encontrado');
    }

    // Agrupar por tipo de archivo
    const porTipo = registros.reduce((acc: any, r) => {
      if (!acc[r.tipoArchivo]) acc[r.tipoArchivo] = [];
      acc[r.tipoArchivo].push(r);
      return acc;
    }, {});

    // Generar estructura XML (simplificada)
    const xml = {
      lote,
      fechaGeneracion: new Date().toISOString(),
      totalRegistros: registros.length,
      archivos: Object.entries(porTipo).map(([tipo, regs]: [string, any]) => ({
        tipo,
        cantidad: regs.length,
        registros: regs.map((r: any) => ({
          tipoDocumento: r.tipoDocumento,
          numeroDocumento: r.numeroDocumento,
          fechaServicio: r.fechaServicio,
          codigoServicio: r.codigoServicio,
          diagnosticoPrincipal: r.diagnosticoPrincipal,
          valorTotal: r.valorTotal,
        })),
      })),
    };

    return xml;
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  async getEstadisticas(ipsId?: string) {
    const where = ipsId ? { ipsId } : {};

    const [
      total,
      porEstado,
      porTipo,
      valorTotal,
    ] = await Promise.all([
      this.prisma.rIPS.count({ where }),
      this.prisma.rIPS.groupBy({
        by: ['estado'],
        where,
        _count: true,
      }),
      this.prisma.rIPS.groupBy({
        by: ['tipoArchivo'],
        where,
        _count: true,
      }),
      this.prisma.rIPS.aggregate({
        where,
        _sum: { valorTotal: true },
      }),
    ]);

    return {
      total,
      porEstado,
      porTipo,
      valorTotal: valorTotal._sum.valorTotal || 0,
      catalogos: {
        tiposArchivo: {
          AF: 'Afiliados',
          AC: 'Consultas',
          AP: 'Procedimientos',
          AM: 'Medicamentos',
          AU: 'Urgencias',
          AH: 'Hospitalizaciones',
          AN: 'Recién Nacidos',
          AT: 'Otros Servicios',
        },
        finalidades: FINALIDADES,
        causasExternas: CAUSAS_EXTERNAS,
      },
    };
  }
}
