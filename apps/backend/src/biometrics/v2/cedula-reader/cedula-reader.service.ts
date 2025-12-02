import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

export interface CedulaScanData {
  documentNumber: string;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  gender?: string;
  bloodType?: string;
  expeditionDate?: Date;
  expirationDate?: Date;
  expeditionPlace?: string;
  mrzData?: string;
  chipData?: Record<string, any>;
  qrData?: string;
  photoBase64?: string;
}

@Injectable()
export class CedulaReaderService {
  private readonly logger = new Logger(CedulaReaderService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Procesa escaneo de cédula
   */
  async processScan(sessionId: string, data: CedulaScanData) {
    this.logger.log(`Processing cedula scan for session ${sessionId}`);

    // Hash de la foto si existe
    const photoHash = data.photoBase64
      ? crypto.createHash('sha256').update(data.photoBase64).digest('hex')
      : null;

    // Validar datos
    const validationErrors = this.validateCedulaData(data);
    const isValid = validationErrors.length === 0;

    // Guardar escaneo
    const scan = await this.prisma.cedulaScan.create({
      data: {
        sessionId,
        documentNumber: data.documentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        gender: data.gender,
        bloodType: data.bloodType,
        expeditionDate: data.expeditionDate,
        expirationDate: data.expirationDate,
        expeditionPlace: data.expeditionPlace,
        mrzData: data.mrzData,
        chipData: data.chipData,
        qrData: data.qrData,
        photoHash,
        isValid,
        validationErrors,
      },
    });

    await this.auditService.log({
      sessionId,
      action: 'CEDULA_SCAN',
      resource: 'cedula-reader',
      outcome: isValid ? 'SUCCESS' : 'FAILURE',
      details: {
        documentNumber: data.documentNumber,
        isValid,
        validationErrors,
        hasMRZ: !!data.mrzData,
        hasChip: !!data.chipData,
        hasQR: !!data.qrData,
        hasPhoto: !!data.photoBase64,
      },
    });

    return {
      scan,
      isValid,
      validationErrors,
      extractedData: {
        documentNumber: data.documentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        gender: data.gender,
      },
    };
  }

  /**
   * Valida datos de la cédula
   */
  private validateCedulaData(data: CedulaScanData): string[] {
    const errors: string[] = [];

    // Validar número de documento
    if (!data.documentNumber || data.documentNumber.length < 6) {
      errors.push('INVALID_DOCUMENT_NUMBER');
    }

    // Validar fecha de expiración
    if (data.expirationDate && new Date(data.expirationDate) < new Date()) {
      errors.push('DOCUMENT_EXPIRED');
    }

    // Validar consistencia MRZ vs datos
    if (data.mrzData) {
      // TODO: Implementar validación de checksum MRZ
    }

    return errors;
  }

  /**
   * Actualiza resultado de match facial
   */
  async updateFaceMatch(scanId: string, faceMatchScore: number, sessionId: string) {
    const faceMatchResult = faceMatchScore >= 0.65 ? 'MATCH' 
      : faceMatchScore >= 0.45 ? 'INCONCLUSIVE' 
      : 'NO_MATCH';

    await this.prisma.cedulaScan.update({
      where: { id: scanId },
      data: { faceMatchScore, faceMatchResult },
    });

    await this.auditService.log({
      sessionId,
      action: 'CEDULA_FACE_MATCH',
      resource: 'cedula-reader',
      outcome: faceMatchResult === 'MATCH' ? 'SUCCESS' : 'FAILURE',
      details: { scanId, faceMatchScore, faceMatchResult },
    });

    return { faceMatchScore, faceMatchResult };
  }

  /**
   * Busca paciente por número de documento
   */
  async findPatientByDocument(documentNumber: string) {
    return this.prisma.patient.findFirst({
      where: { docNumber: documentNumber },
    });
  }
}
