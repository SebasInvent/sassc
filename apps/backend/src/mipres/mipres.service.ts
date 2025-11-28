import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MipresService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CREAR PRESCRIPCIÓN MIPRES
  // ==========================================

  async crearPrescripcion(data: {
    tipoDocumento: string;
    numeroDocumento: string;
    patientId: string;
    practitionerId: string;
    tipoIdPrescriptor: string;
    numeroIdPrescriptor: string;
    tipoTecnologia: string;
    codigoCUM?: string;
    descripcion: string;
    principioActivo?: string;
    concentracion?: string;
    formaFarmaceutica?: string;
    viaAdministracion?: string;
    cantidadPrescrita: number;
    frecuencia?: string;
    duracionTratamiento?: number;
    justificacionMedica: string;
    indicacion?: string;
  }) {
    // Validar justificación médica (obligatoria para NO PBS)
    if (!data.justificacionMedica || data.justificacionMedica.length < 50) {
      throw new BadRequestException('La justificación médica debe tener al menos 50 caracteres');
    }

    return this.prisma.mIPRES.create({
      data: {
        ...data,
        estado: 'borrador',
      },
    });
  }

  // ==========================================
  // ENVIAR A MIPRES (Simulado)
  // ==========================================

  async enviarAMipres(id: string) {
    const prescripcion = await this.prisma.mIPRES.findUnique({ where: { id } });
    if (!prescripcion) throw new NotFoundException('Prescripción no encontrada');

    if (prescripcion.estado !== 'borrador') {
      throw new BadRequestException('Solo se pueden enviar prescripciones en borrador');
    }

    // Simular envío a MIPRES y generar número
    const numeroPrescripcion = `MIPRES-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Simular respuesta (en producción sería la API real de MIPRES)
    const aprobado = Math.random() > 0.2; // 80% de aprobación simulada

    const updated = await this.prisma.mIPRES.update({
      where: { id },
      data: {
        numeroPrescripcion,
        estado: aprobado ? 'aprobado' : 'rechazado',
        fechaAprobacion: aprobado ? new Date() : null,
        codigoRespuesta: aprobado ? '00' : '99',
        mensajeRespuesta: aprobado 
          ? 'Prescripción aprobada por MIPRES' 
          : 'Rechazada: Justificación insuficiente',
      },
    });

    return {
      prescripcion: updated,
      mensaje: aprobado ? 'Prescripción aprobada' : 'Prescripción rechazada',
    };
  }

  // ==========================================
  // REGISTRAR DISPENSACIÓN
  // ==========================================

  async registrarDispensacion(id: string, cantidadEntregada: number) {
    const prescripcion = await this.prisma.mIPRES.findUnique({ where: { id } });
    if (!prescripcion) throw new NotFoundException('Prescripción no encontrada');

    if (prescripcion.estado !== 'aprobado') {
      throw new BadRequestException('Solo se pueden dispensar prescripciones aprobadas');
    }

    const nuevaCantidad = prescripcion.cantidadEntregada + cantidadEntregada;
    const dispensadoCompleto = nuevaCantidad >= prescripcion.cantidadPrescrita;

    return this.prisma.mIPRES.update({
      where: { id },
      data: {
        cantidadEntregada: nuevaCantidad,
        estado: dispensadoCompleto ? 'dispensado' : 'aprobado',
        fechaDispensacion: dispensadoCompleto ? new Date() : null,
      },
    });
  }

  // ==========================================
  // LISTAR PRESCRIPCIONES
  // ==========================================

  async listarPrescripciones(filters?: {
    patientId?: string;
    practitionerId?: string;
    estado?: string;
  }) {
    const where: any = {};

    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.practitionerId) where.practitionerId = filters.practitionerId;
    if (filters?.estado) where.estado = filters.estado;

    const prescripciones = await this.prisma.mIPRES.findMany({
      where,
      orderBy: { fechaPrescripcion: 'desc' },
      take: 100,
    });

    // Obtener info de pacientes y practitioners
    const patientIds = [...new Set(prescripciones.map(p => p.patientId))];
    const practitionerIds = [...new Set(prescripciones.map(p => p.practitionerId))];

    const [patients, practitioners] = await Promise.all([
      this.prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, firstName: true, lastName: true, docNumber: true },
      }),
      this.prisma.practitioner.findMany({
        where: { id: { in: practitionerIds } },
        select: { id: true, firstName: true, lastName: true, license: true },
      }),
    ]);

    const patientsMap = new Map(patients.map(p => [p.id, p]));
    const practitionersMap = new Map(practitioners.map(p => [p.id, p]));

    return prescripciones.map(p => ({
      ...p,
      patient: patientsMap.get(p.patientId),
      practitioner: practitionersMap.get(p.practitionerId),
    }));
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  async getEstadisticas() {
    const [
      total,
      porEstado,
      porTipo,
    ] = await Promise.all([
      this.prisma.mIPRES.count(),
      this.prisma.mIPRES.groupBy({
        by: ['estado'],
        _count: true,
      }),
      this.prisma.mIPRES.groupBy({
        by: ['tipoTecnologia'],
        _count: true,
      }),
    ]);

    return {
      total,
      porEstado,
      porTipo,
      tiposTecnologia: {
        '1': 'Medicamento',
        '2': 'Procedimiento',
        '3': 'Dispositivo médico',
        '4': 'Producto nutricional',
        '5': 'Servicio complementario',
      },
    };
  }
}
