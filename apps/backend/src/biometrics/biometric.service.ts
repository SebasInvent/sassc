import { Injectable, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacialRecognitionService } from './services/facial-recognition.service';
import { FingerprintService } from './services/fingerprint.service';
import { OCRService } from './services/ocr.service';
import { RA08IntegrationService } from './services/ra08-integration.service';
import {
  RegisterBiometricDto,
  VerifyBiometricDto,
  LoginBiometricDto,
  LoginBiometricResponseDto,
  CheckinBiometricDto,
  CheckinBiometricResponseDto,
  SearchBiometricDto,
  BiometricSearchResultDto,
  UpdateBiometricDto,
  BiometricStatsDto,
} from './dto';

@Injectable()
export class BiometricService {
  private readonly logger = new Logger(BiometricService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly facialService: FacialRecognitionService,
    private readonly fingerprintService: FingerprintService,
    private readonly ocrService: OCRService,
    private readonly ra08Service: RA08IntegrationService,
  ) {}

  /**
   * Registra datos biométricos para un usuario o paciente
   */
  async register(dto: RegisterBiometricDto): Promise<any> {
    try {
      this.logger.log(`Registrando datos biométricos para: ${dto.patientId}`);

      // Validar que el paciente existe
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
      });

      if (!patient) {
        throw new NotFoundException('Paciente no encontrado');
      }

      // Verificar si ya tiene datos biométricos
      const existing = await this.prisma.biometricData.findUnique({
        where: { patientId: dto.patientId },
      });

      if (existing) {
        throw new HttpException(
          'El paciente ya tiene datos biométricos registrados',
          HttpStatus.CONFLICT,
        );
      }

      // Extraer descriptores faciales si se proporcionó imagen
      let faceDescriptors = null;
      let faceQuality = null;
      if (dto.biometricData && dto.biometricType === 'facial') {
        const descriptors = await this.facialService.extractFaceDescriptors(dto.biometricData);
        faceDescriptors = descriptors.map(d => d.descriptor);
        faceQuality = descriptors[0]?.confidence || 0;

        // Validar calidad
        const quality = await this.facialService.validateFaceQuality(dto.biometricData);
        if (!quality.isValid) {
          throw new HttpException(
            `Calidad de imagen facial insuficiente: ${quality.issues.join(', ')}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Generar ID para RA08
      const ra08PersonId = `PERSON_${patient.docNumber}`;

      // Crear registro biométrico
      const biometricData = await this.prisma.biometricData.create({
        data: {
          patientId: dto.patientId,
          faceDescriptors: faceDescriptors as any,
          facePhotos: dto.biometricData ? [dto.biometricData] : [],
          faceQualityScore: faceQuality,
          ra08PersonId: ra08PersonId,
          status: 'ACTIVE',
          isVerified: true,
          verificationMethod: dto.biometricType === 'facial' ? 'FACIAL' : 'FINGERPRINT',
        },
      });

      // Sincronizar con dispositivos RA08 si es facial
      if (dto.biometricData && dto.biometricType === 'facial') {
        const syncResult = await this.ra08Service.syncPersonToAllDevices(
          ra08PersonId,
          `${patient.firstName} ${patient.lastName}`,
          patient.docNumber,
          dto.biometricData,
        );

        this.logger.log(
          `Sincronización RA08: ${syncResult.success} exitosos, ${syncResult.failed} fallidos`,
        );
      }

      // Actualizar paciente
      await this.prisma.patient.update({
        where: { id: dto.patientId },
        data: {
          biometricRegistered: true,
          biometricRegDate: new Date(),
        },
      });

      // Crear log de auditoría
      await this.prisma.biometricAuditLog.create({
        data: {
          biometricDataId: biometricData.id,
          eventType: 'REGISTRATION',
          eventResult: 'SUCCESS',
          eventDescription: 'Registro biométrico inicial',
          verificationMethod: dto.biometricType,
        },
      });

      this.logger.log(`Registro biométrico completado: ${biometricData.id}`);

      return {
        success: true,
        message: 'Registro biométrico completado exitosamente',
        data: {
          id: biometricData.id,
          ra08PersonId: ra08PersonId,
          status: biometricData.status,
        },
      };
    } catch (error) {
      this.logger.error(`Error en registro biométrico: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica datos biométricos
   */
  async verify(dto: VerifyBiometricDto): Promise<any> {
    try {
      this.logger.log('Verificando datos biométricos...');

      // Buscar todos los registros biométricos activos
      const allBiometricData = await this.prisma.biometricData.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          patient: true,
          user: true,
        },
      });

      if (allBiometricData.length === 0) {
        return {
          success: false,
          message: 'No hay registros biométricos en el sistema',
        };
      }

      // Extraer descriptores de la imagen capturada
      const capturedDescriptors = await this.facialService.extractFaceDescriptors(dto.biometricData);

      // Buscar coincidencia
      const databaseDescriptors = allBiometricData
        .filter(bd => bd.faceDescriptors)
        .map(bd => ({
          id: bd.id,
          descriptors: bd.faceDescriptors as any as number[][],
        }));

      const match = await this.facialService.searchFace(
        capturedDescriptors.map(d => d.descriptor),
        databaseDescriptors,
        0.80,
      );

      if (!match) {
        // Registrar intento fallido - persona no registrada en el sistema
        this.logger.warn('Verificación biométrica fallida - persona NO REGISTRADA en el sistema');
        
        return {
          success: false,
          isNotRegistered: true,
          message: 'No estás registrado en el sistema. Por favor, procede al registro para poder acceder.',
          registrationUrl: '/auth/register',
          verificationScore: 0,
        };
      }

      // Obtener datos completos del match
      const matchedData = allBiometricData.find(bd => bd.id === match.id);

      // Crear log de auditoría
      await this.prisma.biometricAuditLog.create({
        data: {
          biometricDataId: match.id,
          eventType: 'VERIFICATION',
          eventResult: 'SUCCESS',
          verificationScore: match.confidence,
          verificationMethod: 'facial',
        },
      });

      // Actualizar contador de verificaciones
      await this.prisma.biometricData.update({
        where: { id: match.id },
        data: {
          lastVerification: new Date(),
          verificationCount: { increment: 1 },
        },
      });

      this.logger.log(`Verificación exitosa: ${match.id} (confidence: ${match.confidence.toFixed(2)})`);

      return {
        success: true,
        message: 'Verificación biométrica exitosa',
        verificationScore: match.confidence,
        data: {
          patient: matchedData?.patient,
          user: matchedData?.user,
        },
      };
    } catch (error) {
      this.logger.error(`Error en verificación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Login biométrico
   */
  async login(dto: LoginBiometricDto): Promise<LoginBiometricResponseDto> {
    try {
      this.logger.log(`Intento de login biométrico: ${dto.method}`);

      if (!dto.faceImageBase64) {
        throw new HttpException(
          'Se requiere imagen facial para el login',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verificar biometría
      const verificationResult = await this.verify({
        biometricType: 'facial',
        biometricData: dto.faceImageBase64,
      });

      if (!verificationResult.success) {
        // Registrar intento fallido - persona no registrada
        this.logger.warn('Login biométrico fallido - persona NO REGISTRADA');
        
        return {
          success: false,
          isNotRegistered: verificationResult.isNotRegistered || true,
          message: verificationResult.isNotRegistered 
            ? 'No estás registrado en el sistema. Por favor, procede al registro para poder acceder.'
            : 'No se pudo verificar tu identidad. Intenta de nuevo o contacta al administrador.',
          registrationUrl: '/auth/register',
          verificationScore: verificationResult.verificationScore,
        };
      }

      const user = verificationResult.data?.user;
      if (!user) {
        throw new HttpException(
          'Usuario no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      // TODO: Generar JWT token
      // const accessToken = await this.authService.generateToken(user);

      // Actualizar último login biométrico
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastBiometricLogin: new Date(),
          lastLoginAt: new Date(),
        },
      });

      this.logger.log(`Login biométrico exitoso: ${user.email}`);

      return {
        success: true,
        message: 'Login biométrico exitoso',
        // accessToken: accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        verificationScore: verificationResult.verificationScore,
        method: dto.method,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error en login biométrico: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check-in biométrico
   */
  async checkin(dto: CheckinBiometricDto): Promise<CheckinBiometricResponseDto> {
    try {
      this.logger.log(`Check-in biométrico: ${dto.type}`);

      // Verificar biometría
      const verificationResult = await this.verify({
        biometricType: 'facial',
        biometricData: dto.faceImageBase64,
      });

      if (!verificationResult.success) {
        return {
          success: false,
          isNotRegistered: verificationResult.isNotRegistered || false,
          message: verificationResult.isNotRegistered
            ? 'No estás registrado en el sistema. Por favor, procede al registro para poder realizar el check-in.'
            : 'No se pudo verificar tu identidad. Intenta de nuevo.',
          registrationUrl: verificationResult.isNotRegistered ? '/auth/register' : undefined,
          verificationScore: verificationResult.verificationScore,
        };
      }

      const patient = verificationResult.data?.patient;
      if (!patient) {
        throw new HttpException(
          'Paciente no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      // Actualizar contador de check-ins
      await this.prisma.patient.update({
        where: { id: patient.id },
        data: {
          biometricCheckinCount: { increment: 1 },
          lastBiometricCheckin: new Date(),
        },
      });

      // Si hay appointmentId, actualizar la cita
      let appointment = null;
      if (dto.appointmentId) {
        appointment = await this.prisma.appointment.update({
          where: { id: dto.appointmentId },
          data: {
            status: 'arrived',
          },
          include: {
            practitioner: true,
          },
        });
      }

      this.logger.log(`Check-in exitoso: ${patient.firstName} ${patient.lastName}`);

      return {
        success: true,
        message: 'Check-in exitoso',
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          docNumber: patient.docNumber,
          docType: patient.docType,
        },
        appointment: appointment ? {
          id: appointment.id,
          scheduledTime: (appointment as any).scheduledTime || new Date(),
          practitionerName: `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`,
          specialty: appointment.practitioner.specialty,
        } : undefined,
        verificationScore: verificationResult.verificationScore,
        timestamp: new Date(),
        checkinNumber: patient.biometricCheckinCount + 1,
        location: dto.locationName ? {
          name: dto.locationName,
          latitude: dto.latitude,
          longitude: dto.longitude,
        } : undefined,
      };
    } catch (error) {
      this.logger.error(`Error en check-in: ${error.message}`);
      throw error;
    }
  }

  /**
   * Buscar registros biométricos
   */
  async search(dto: SearchBiometricDto): Promise<BiometricSearchResultDto[]> {
    try {
      this.logger.log('Buscando registros biométricos...');

      // TODO: Implementar búsqueda completa
      const results = await this.prisma.biometricData.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          user: true,
          patient: true,
        },
        take: dto.maxResults || 10,
      });

      return results.map(bd => ({
        id: bd.id,
        user: bd.user ? {
          id: bd.user.id,
          email: bd.user.email,
          firstName: bd.user.firstName,
          lastName: bd.user.lastName,
          role: bd.user.role,
        } : undefined,
        patient: bd.patient ? {
          id: bd.patient.id,
          firstName: bd.patient.firstName,
          lastName: bd.patient.lastName,
          docNumber: bd.patient.docNumber,
          docType: bd.patient.docType,
        } : undefined,
        matchScore: 1.0,
        method: bd.verificationMethod as any,
        registrationDate: bd.registrationDate,
        lastVerification: bd.lastVerification || undefined,
        status: bd.status,
      }));
    } catch (error) {
      this.logger.error(`Error en búsqueda: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualizar datos biométricos
   */
  async update(id: string, dto: UpdateBiometricDto): Promise<any> {
    try {
      this.logger.log(`Actualizando datos biométricos: ${id}`);

      const biometricData = await this.prisma.biometricData.findUnique({
        where: { id },
      });

      if (!biometricData) {
        throw new NotFoundException('Registro biométrico no encontrado');
      }

      const updateData: any = {};

      if (dto.status) {
        updateData.status = dto.status;
      }

      if (dto.requireLivenessCheck !== undefined) {
        updateData.requireLivenessCheck = dto.requireLivenessCheck;
      }

      if (dto.confidenceThreshold !== undefined) {
        updateData.confidenceThreshold = dto.confidenceThreshold;
      }

      const updated = await this.prisma.biometricData.update({
        where: { id },
        data: updateData,
      });

      // Crear log de auditoría
      await this.prisma.biometricAuditLog.create({
        data: {
          biometricDataId: id,
          eventType: 'UPDATE',
          eventResult: 'SUCCESS',
          eventDescription: dto.notes || 'Actualización de datos biométricos',
        },
      });

      return {
        success: true,
        message: 'Datos biométricos actualizados',
        data: updated,
      };
    } catch (error) {
      this.logger.error(`Error actualizando: ${error.message}`);
      throw error;
    }
  }

  /**
   * Eliminar datos biométricos
   */
  async delete(id: string): Promise<any> {
    try {
      this.logger.log(`Eliminando datos biométricos: ${id}`);

      const biometricData = await this.prisma.biometricData.findUnique({
        where: { id },
      });

      if (!biometricData) {
        throw new NotFoundException('Registro biométrico no encontrado');
      }

      // Eliminar de dispositivos RA08
      if (biometricData.ra08PersonId) {
        await this.ra08Service.deletePersonFromAllDevices(biometricData.ra08PersonId);
      }

      // Eliminar registro
      await this.prisma.biometricData.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Datos biométricos eliminados',
      };
    } catch (error) {
      this.logger.error(`Error eliminando: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats(): Promise<BiometricStatsDto> {
    try {
      const [
        total,
        active,
        suspended,
        revoked,
        verificationsToday,
        activeDevices,
        onlineDevices,
      ] = await Promise.all([
        this.prisma.biometricData.count(),
        this.prisma.biometricData.count({ where: { status: 'ACTIVE' } }),
        this.prisma.biometricData.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.biometricData.count({ where: { status: 'REVOKED' } }),
        this.prisma.biometricAuditLog.count({
          where: {
            eventType: { in: ['LOGIN', 'VERIFICATION', 'CHECKIN'] },
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        this.prisma.rA08Device.count({ where: { status: 'ACTIVE' } }),
        this.prisma.rA08Device.count({ where: { isOnline: true } }),
      ]);

      const successfulToday = await this.prisma.biometricAuditLog.count({
        where: {
          eventType: { in: ['LOGIN', 'VERIFICATION', 'CHECKIN'] },
          eventResult: 'SUCCESS',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });

      return {
        totalRegistrations: total,
        activeRegistrations: active,
        suspendedRegistrations: suspended,
        revokedRegistrations: revoked,
        verificationsToday: verificationsToday,
        successfulVerificationsToday: successfulToday,
        failedVerificationsToday: verificationsToday - successfulToday,
        activeRA08Devices: activeDevices,
        onlineRA08Devices: onlineDevices,
        lastUpdate: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      throw error;
    }
  }
}
