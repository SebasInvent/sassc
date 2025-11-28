import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Plantillas de consentimiento según tipo
const PLANTILLAS = {
  DATOS_PERSONALES: {
    titulo: 'Consentimiento para Tratamiento de Datos Personales',
    descripcion: `En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, autorizo el tratamiento de mis datos personales, incluyendo datos sensibles de salud, para los fines relacionados con la prestación de servicios de salud.`,
    riesgos: null,
    beneficios: null,
  },
  TRATAMIENTO: {
    titulo: 'Consentimiento Informado para Tratamiento Médico',
    descripcion: `Declaro que he sido informado(a) de manera clara y comprensible sobre mi condición de salud, el tratamiento propuesto, sus objetivos y la duración esperada.`,
    riesgos: `He sido informado(a) sobre los posibles riesgos y complicaciones del tratamiento, incluyendo efectos secundarios y reacciones adversas.`,
    beneficios: `Se me han explicado los beneficios esperados del tratamiento propuesto.`,
  },
  PROCEDIMIENTO: {
    titulo: 'Consentimiento Informado para Procedimiento',
    descripcion: `Autorizo la realización del procedimiento médico indicado, habiendo recibido información completa sobre el mismo.`,
    riesgos: `He sido informado(a) sobre los riesgos inherentes al procedimiento, incluyendo posibles complicaciones.`,
    beneficios: `Se me han explicado los beneficios esperados del procedimiento.`,
  },
  TELEMEDICINA: {
    titulo: 'Consentimiento para Atención por Telemedicina',
    descripcion: `Autorizo la atención médica a través de medios tecnológicos (telemedicina), entendiendo las limitaciones de este tipo de consulta.`,
    riesgos: `Entiendo que la telemedicina tiene limitaciones en el examen físico y que en algunos casos puede ser necesaria una consulta presencial.`,
    beneficios: `La telemedicina me permite acceder a atención médica de manera remota, reduciendo tiempos de espera y desplazamientos.`,
  },
  INVESTIGACION: {
    titulo: 'Consentimiento para Participación en Investigación',
    descripcion: `Acepto participar voluntariamente en el estudio de investigación descrito, habiendo recibido información completa sobre el mismo.`,
    riesgos: `He sido informado(a) sobre los posibles riesgos de participar en esta investigación.`,
    beneficios: `Se me han explicado los posibles beneficios de mi participación en este estudio.`,
  },
};

@Injectable()
export class ConsentimientoService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CREAR CONSENTIMIENTO
  // ==========================================

  async crearConsentimiento(data: {
    patientId: string;
    tipo: string;
    titulo?: string;
    descripcion?: string;
    riesgos?: string;
    beneficios?: string;
    alternativas?: string;
    practitionerId?: string;
  }) {
    // Usar plantilla si no se proporciona contenido
    const plantilla = PLANTILLAS[data.tipo as keyof typeof PLANTILLAS];
    
    return this.prisma.consentimientoInformado.create({
      data: {
        patientId: data.patientId,
        tipo: data.tipo,
        titulo: data.titulo || plantilla?.titulo || `Consentimiento ${data.tipo}`,
        descripcion: data.descripcion || plantilla?.descripcion || '',
        riesgos: data.riesgos || plantilla?.riesgos,
        beneficios: data.beneficios || plantilla?.beneficios,
        alternativas: data.alternativas,
        practitionerId: data.practitionerId,
      },
    });
  }

  // ==========================================
  // FIRMAR CONSENTIMIENTO
  // ==========================================

  async firmarConsentimiento(id: string, firmaBiometricaId?: string, firmaDigital?: string) {
    const consentimiento = await this.prisma.consentimientoInformado.findUnique({
      where: { id },
    });

    if (!consentimiento) throw new NotFoundException('Consentimiento no encontrado');
    if (consentimiento.firmado) throw new BadRequestException('El consentimiento ya fue firmado');

    return this.prisma.consentimientoInformado.update({
      where: { id },
      data: {
        firmado: true,
        fechaFirma: new Date(),
        firmaBiometricaId,
        firmaDigital,
      },
    });
  }

  // ==========================================
  // REVOCAR CONSENTIMIENTO
  // ==========================================

  async revocarConsentimiento(id: string, motivo: string) {
    const consentimiento = await this.prisma.consentimientoInformado.findUnique({
      where: { id },
    });

    if (!consentimiento) throw new NotFoundException('Consentimiento no encontrado');
    if (!consentimiento.firmado) throw new BadRequestException('El consentimiento no ha sido firmado');
    if (consentimiento.revocado) throw new BadRequestException('El consentimiento ya fue revocado');

    return this.prisma.consentimientoInformado.update({
      where: { id },
      data: {
        revocado: true,
        fechaRevocacion: new Date(),
        motivoRevocacion: motivo,
      },
    });
  }

  // ==========================================
  // LISTAR CONSENTIMIENTOS
  // ==========================================

  async listarConsentimientos(filters?: {
    patientId?: string;
    tipo?: string;
    firmado?: boolean;
  }) {
    const where: any = {};

    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.tipo) where.tipo = filters.tipo;
    if (filters?.firmado !== undefined) where.firmado = filters.firmado;

    const consentimientos = await this.prisma.consentimientoInformado.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Obtener info de pacientes
    const patientIds = [...new Set(consentimientos.map(c => c.patientId))];
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: { id: true, firstName: true, lastName: true, docNumber: true },
    });
    const patientsMap = new Map(patients.map(p => [p.id, p]));

    return consentimientos.map(c => ({
      ...c,
      patient: patientsMap.get(c.patientId),
    }));
  }

  // ==========================================
  // OBTENER CONSENTIMIENTOS DE PACIENTE
  // ==========================================

  async getConsentimientosPaciente(patientId: string) {
    return this.prisma.consentimientoInformado.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // VERIFICAR CONSENTIMIENTO VIGENTE
  // ==========================================

  async verificarConsentimientoVigente(patientId: string, tipo: string) {
    const consentimiento = await this.prisma.consentimientoInformado.findFirst({
      where: {
        patientId,
        tipo,
        firmado: true,
        revocado: false,
      },
      orderBy: { fechaFirma: 'desc' },
    });

    return {
      tieneConsentimiento: !!consentimiento,
      consentimiento,
    };
  }

  // ==========================================
  // PLANTILLAS DISPONIBLES
  // ==========================================

  getPlantillas() {
    return Object.entries(PLANTILLAS).map(([tipo, plantilla]) => ({
      tipo,
      ...plantilla,
    }));
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  async getEstadisticas() {
    const [
      total,
      firmados,
      revocados,
      porTipo,
    ] = await Promise.all([
      this.prisma.consentimientoInformado.count(),
      this.prisma.consentimientoInformado.count({ where: { firmado: true } }),
      this.prisma.consentimientoInformado.count({ where: { revocado: true } }),
      this.prisma.consentimientoInformado.groupBy({
        by: ['tipo'],
        _count: true,
      }),
    ]);

    return {
      total,
      firmados,
      pendientes: total - firmados,
      revocados,
      porTipo,
    };
  }
}
