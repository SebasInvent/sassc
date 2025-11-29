import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PatientLoginDto, FacialRecognitionDto, ConfirmActionFacialDto, RA08CallbackDto } from './dto';
import { RegisterFaceDto } from './dto/register-face.dto';
import { AwsRekognitionService } from '../services/aws-rekognition.service';
import { PythonBiometricsService } from '../biometrics/services/python-biometrics.service';
import { BiometricStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private awsRekognition: AwsRekognitionService,
    private pythonBiometrics: PythonBiometricsService,
  ) {}

  async login(license: string) {
    console.log('🔍 Login attempt with license:', license);
    
    // TEMPORAL: Buscar sin include para evitar problemas
    const practitioner = await this.prisma.practitioner.findUnique({
      where: { license },
    });
    
    console.log('🔍 Practitioner found:', JSON.stringify(practitioner));
    
    if (!practitioner) {
      console.log('❌ Practitioner NOT found');
      throw new UnauthorizedException('Licencia no encontrada o incorrecta.');
    }
    
    // Verificar que el practitioner tenga los campos necesarios
    if (!practitioner.firstName || !practitioner.lastName) {
      console.error('❌ Practitioner missing firstName or lastName:', practitioner);
      throw new UnauthorizedException('Datos del profesional incompletos.');
    }
    
    console.log('✅ Practitioner OK, creating response...');
    
    // TEMPORAL: Asignar rol basado en la licencia
    let role = 'DOCTOR';
    if (license === 'MP-43423635') role = 'ADMIN';
    else if (license === 'MP-11223344') role = 'NURSE';
    else if (license === 'MP-55667788') role = 'PHARMACIST';
    else if (license === 'MP-99887766') role = 'RADIOLOGIST';
    
    const userName = `${practitioner.firstName} ${practitioner.lastName}`;
    
    const payload = {
      sub: practitioner.id,
      name: practitioner.firstName,
      lastName: practitioner.lastName,
      license: practitioner.license,
      specialty: practitioner.specialty,
      role: role,
      userId: null,
      scope: 'read:dashboard',
    };
    
    const userResponse = {
      id: practitioner.id,
      name: userName,
      license: practitioner.license,
      specialty: practitioner.specialty,
      role: role,
    };
    
    console.log('✅ Returning user:', userResponse);
    
    return {
      access_token: this.jwtService.sign(payload),
      user: userResponse,
    };
  }

  async loginPatient(patientLoginDto: PatientLoginDto) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        docType: patientLoginDto.docType,
        docNumber: patientLoginDto.docNumber,
      },
    });

    if (!patient) {
      throw new UnauthorizedException('Paciente no encontrado o credenciales incorrectas.');
    }

    const payload = { sub: patient.id, name: patient.firstName };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // ==========================================
  // FACIAL RECOGNITION METHODS (PRINCIPAL)
  // ==========================================

  /**
   * Login mediante reconocimiento facial (MÉTODO PRINCIPAL)
   * Recibe datos del callback del dispositivo RA08
   */
  async loginFacial(recognitionData: FacialRecognitionDto) {
    console.log('👤 Facial login attempt:', {
      deviceKey: recognitionData.deviceKey,
      personId: recognitionData.personId,
      searchScore: recognitionData.searchScore,
      livenessScore: recognitionData.livenessScore,
    });

    // Buscar usuario por biometricData.ra08PersonId
    const biometricData = await this.prisma.biometricData.findUnique({
      where: { ra08PersonId: recognitionData.personId },
      include: {
        user: {
          include: {
            practitioner: true,
            patient: true,
          },
        },
      },
    });

    if (!biometricData || !biometricData.user) {
      console.log('⚠️ Usuario NO REGISTRADO - personId no encontrado:', recognitionData.personId);
      await this.createLoginHistory(null, false, 'facial', {
        deviceKey: recognitionData.deviceKey,
        searchScore: recognitionData.searchScore,
        reason: 'NOT_REGISTERED',
      });
      // En lugar de lanzar excepción, retornamos respuesta estructurada
      return {
        success: false,
        isNotRegistered: true,
        message: 'No estás registrado en el sistema. Por favor, procede al registro para poder acceder.',
        registrationUrl: '/auth/register',
        personId: recognitionData.personId,
      };
    }

    const user = biometricData.user;

    // Verificar que el usuario esté activo
    if (!user.isActive) {
      console.log('❌ User is inactive:', user.id);
      await this.createLoginHistory(user.id, false, 'facial', {
        deviceKey: recognitionData.deviceKey,
        searchScore: recognitionData.searchScore,
      });
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Validar scores mínimos para login
    const MIN_SEARCH_SCORE = 0.85;
    const MIN_LIVENESS_SCORE = 0.70;

    if (
      recognitionData.searchScore < MIN_SEARCH_SCORE ||
      recognitionData.livenessScore < MIN_LIVENESS_SCORE
    ) {
      console.log('❌ Insufficient confidence scores:', {
        searchScore: recognitionData.searchScore,
        livenessScore: recognitionData.livenessScore,
      });
      await this.createLoginHistory(user.id, false, 'facial', {
        deviceKey: recognitionData.deviceKey,
        searchScore: recognitionData.searchScore,
        livenessScore: recognitionData.livenessScore,
      });
      throw new UnauthorizedException('Confianza de reconocimiento insuficiente');
    }

    // Actualizar último login biométrico
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastBiometricLogin: new Date(),
        failedLoginAttempts: 0,
      },
    });

    // Guardar imagen facial (opcional)
    let faceImageUrl: string | null = null;
    if (recognitionData.imgBase64) {
      faceImageUrl = await this.saveFaceImage(
        recognitionData.imgBase64,
        user.id,
        'login',
      );
    }

    // Registrar en historial
    await this.createLoginHistory(user.id, true, 'facial', {
      deviceKey: recognitionData.deviceKey,
      searchScore: recognitionData.searchScore,
      livenessScore: recognitionData.livenessScore,
      temperature: recognitionData.temperature,
      faceImageUrl,
    });

    // Generar tokens
    const tokens = await this.generateTokens(user);

    console.log('✅ Facial login successful for user:', user.email);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      biometricConfidence: {
        searchScore: recognitionData.searchScore,
        livenessScore: recognitionData.livenessScore,
        temperature: recognitionData.temperature,
      },
    };
  }

  /**
   * Confirmar acción crítica con reconocimiento facial (FIRMA BIOMÉTRICA)
   * Usado para prescripciones, autorizaciones, dispensaciones, etc.
   */
  async confirmActionWithFacial(dto: ConfirmActionFacialDto) {
    console.log('✍️ Facial confirmation for action:', dto.actionType);

    const { userId, actionType, entityId, entityType, recognitionData } = dto;

    // Buscar usuario y validar que tenga datos biométricos
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { biometricData: true },
    });

    if (!user || !user.biometricData) {
      throw new UnauthorizedException('Usuario sin datos biométricos');
    }

    // Validar que el ra08PersonId coincida con el usuario
    if (user.biometricData.ra08PersonId !== recognitionData.personId) {
      throw new UnauthorizedException('El reconocimiento facial no coincide con el usuario');
    }

    // Validar scores más estrictos para confirmación de acciones
    const MIN_SEARCH_SCORE = 0.90;
    const MIN_LIVENESS_SCORE = 0.75;

    if (
      recognitionData.searchScore < MIN_SEARCH_SCORE ||
      recognitionData.livenessScore < MIN_LIVENESS_SCORE
    ) {
      console.log('❌ Insufficient confidence for action confirmation');
      throw new UnauthorizedException('Confirmación biométrica insuficiente');
    }

    // Guardar evidencia de la firma
    let faceImageUrl: string | null = null;
    if (recognitionData.imgBase64) {
      faceImageUrl = await this.saveFaceImage(
        recognitionData.imgBase64,
        userId,
        actionType,
      );
    }

    // Crear registro de auditoría
    await this.prisma.auditEvent.create({
      data: {
        action: 'E', // Execute
        outcome: 'Success',
        userId: userId,
        entityType: entityType || actionType,
        entityId: entityId,
        reason: `Acción ${actionType} confirmada con reconocimiento facial (score: ${recognitionData.searchScore.toFixed(2)})`,
      },
    });

    console.log('✅ Action confirmed with facial recognition');

    return {
      confirmed: true,
      confidence: {
        searchScore: recognitionData.searchScore,
        livenessScore: recognitionData.livenessScore,
      },
      evidenceUrl: faceImageUrl,
      timestamp: new Date(),
    };
  }

  /**
   * Procesar callback del dispositivo RA08
   * Convierte el formato del RA08 al formato interno
   */
  async processRA08Callback(callbackData: RA08CallbackDto) {
    console.log('📡 RA08 Callback received:', {
      deviceKey: callbackData.deviceKey,
      personId: callbackData.personId,
      type: callbackData.type,
    });

    // type='0' significa STRANGER - persona no registrada en el dispositivo
    if (callbackData.type === '0') {
      console.log('⚠️ Persona NO REGISTRADA detectada por dispositivo RA08');
      return {
        success: false,
        isNotRegistered: true,
        message: 'No estás registrado en el sistema. Por favor, procede al registro para poder acceder.',
        registrationUrl: '/auth/register',
        deviceKey: callbackData.deviceKey,
        timestamp: callbackData.time,
        // Incluir imagen capturada para posible uso en registro
        capturedImage: callbackData.imgBase64,
      };
    }

    // Convertir scores de 0-100 a 0-1
    const searchScore = callbackData.searchScore ? callbackData.searchScore / 100 : 0;
    const livenessScore = callbackData.livenessScore ? callbackData.livenessScore / 100 : 0;

    const recognitionData: FacialRecognitionDto = {
      deviceKey: callbackData.deviceKey,
      personId: callbackData.personId,
      searchScore,
      livenessScore,
      temperature: callbackData.temperature,
      imgBase64: callbackData.imgBase64,
      time: callbackData.time,
      type: callbackData.type === '1' ? 'identify' : 'register',
    };

    // Si es tipo 'identify' (1), hacer login automático
    if (callbackData.type === '1') {
      return this.loginFacial(recognitionData);
    }

    // type='2' = registro, type='3' = temperatura
    // Para otros tipos, solo retornar los datos procesados
    return {
      success: true,
      recognitionData,
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Generar tokens JWT (access + refresh)
   */
  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      practitionerId: user.practitionerId,
      patientId: user.patientId,
    };

    // Access token (15 minutos)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    // Refresh token (7 días)
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    // Guardar refresh token en DB
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutos en segundos
    };
  }

  /**
   * Crear registro en LoginHistory
   */
  private async createLoginHistory(
    userId: string | null,
    success: boolean,
    method: string,
    biometricData?: {
      deviceKey?: string;
      searchScore?: number;
      livenessScore?: number;
      temperature?: number;
      faceImageUrl?: string | null;
    },
  ) {
    if (!userId) {
      // Si no hay userId, crear registro anónimo de intento fallido
      return;
    }

    await this.prisma.loginHistory.create({
      data: {
        userId,
        success,
        method,
        deviceKey: biometricData?.deviceKey,
        searchScore: biometricData?.searchScore,
        livenessScore: biometricData?.livenessScore,
        temperature: biometricData?.temperature,
        faceImageUrl: biometricData?.faceImageUrl,
      },
    });
  }

  /**
   * Guardar imagen facial como evidencia
   */
  private async saveFaceImage(
    imgBase64: string,
    userId: string,
    actionType: string,
  ): Promise<string> {
    try {
      // Crear directorio si no existe
      const uploadDir = path.join(process.cwd(), 'uploads', 'facial-evidence');
      await fs.mkdir(uploadDir, { recursive: true });

      // Generar nombre único
      const timestamp = Date.now();
      const hash = crypto.randomBytes(8).toString('hex');
      const filename = `${userId}_${actionType}_${timestamp}_${hash}.jpg`;
      const filepath = path.join(uploadDir, filename);

      // Remover prefijo data:image si existe
      const base64Data = imgBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Guardar archivo
      await fs.writeFile(filepath, buffer);

      // Retornar URL relativa
      return `/uploads/facial-evidence/${filename}`;
    } catch (error) {
      console.error('Error saving face image:', error);
      return '';
    }
  }

  /**
   * Sanitizar datos del usuario (remover password)
   */
  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Login facial con AWS Rekognition (PRODUCCIÓN)
   * Versión simplificada - comparación directa
   */
  async loginFacialSimple(faceImage: string) {
    const { RekognitionClient, CompareFacesCommand } = await import('@aws-sdk/client-rekognition');
    const fs = await import('fs');
    const pathModule = await import('path');

    console.log('\n👤 LOGIN FACIAL - INICIO');
    console.log('═'.repeat(60));

    try {
      // 1. Buscar usuarios con fotos
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        include: { biometricData: true },
      });

      console.log(`📊 Total usuarios: ${users.length}`);

      const usersWithPhotos = users.filter(
        u => u.biometricData?.facePhotos && u.biometricData.facePhotos.length > 0
      );

      console.log(`📸 Usuarios con fotos: ${usersWithPhotos.length}`);

      if (usersWithPhotos.length === 0) {
        throw new UnauthorizedException('No hay usuarios con datos biométricos registrados');
      }

      // 2. Configurar AWS Rekognition
      const client = new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      // 3. Preparar imagen de login
      const base64Data = faceImage.replace(/^data:image\/\w+;base64,/, '');
      const loginImageBuffer = Buffer.from(base64Data, 'base64');
      console.log(`📷 Imagen de login: ${loginImageBuffer.length} bytes`);

      // 4. Comparar con cada usuario
      let bestMatch: { user: any; similarity: number; confidence: number } | null = null;

      for (const user of usersWithPhotos) {
        console.log(`\n🔍 Comparando con: ${user.email}`);
        
        for (const photoPath of user.biometricData!.facePhotos) {
          try {
            // Construir ruta completa
            const fullPath = pathModule.join(process.cwd(), photoPath.replace(/^\//, ''));
            console.log(`   📁 Foto: ${fullPath}`);

            if (!fs.existsSync(fullPath)) {
              console.log(`   ❌ Archivo no existe`);
              continue;
            }

            const registeredPhotoBuffer = fs.readFileSync(fullPath);
            console.log(`   ✅ Cargada: ${registeredPhotoBuffer.length} bytes`);

            // Comparar con AWS Rekognition
            const command = new CompareFacesCommand({
              SourceImage: { Bytes: registeredPhotoBuffer },
              TargetImage: { Bytes: loginImageBuffer },
              SimilarityThreshold: 70,
            });

            const response = await client.send(command);
            
            if (response.FaceMatches && response.FaceMatches.length > 0) {
              const match = response.FaceMatches[0];
              const similarity = match.Similarity || 0;
              const confidence = match.Face?.Confidence || 0;
              
              console.log(`   🎯 Match! Similitud: ${similarity.toFixed(2)}%`);

              if (!bestMatch || similarity > bestMatch.similarity) {
                bestMatch = { user, similarity, confidence };
              }
            } else {
              console.log(`   ❌ Sin coincidencia`);
            }
          } catch (err: any) {
            console.log(`   ⚠️ Error: ${err.message}`);
          }
        }
      }

      // 5. Verificar resultado
      if (!bestMatch) {
        console.log('\n❌ No se encontró coincidencia con ningún usuario');
        throw new UnauthorizedException('No se reconoció tu rostro. Intenta de nuevo con mejor iluminación.');
      }

      if (bestMatch.similarity < 85) {
        console.log(`\n❌ Similitud insuficiente: ${bestMatch.similarity.toFixed(2)}%`);
        throw new UnauthorizedException(`Similitud insuficiente (${bestMatch.similarity.toFixed(1)}%). Se requiere al menos 85%.`);
      }

      const user = bestMatch.user;
      console.log(`\n✅ MATCH ENCONTRADO: ${user.email} (${bestMatch.similarity.toFixed(2)}%)`);

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // Actualizar último login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastBiometricLogin: new Date(),
          failedLoginAttempts: 0,
        },
      });

      // Guardar evidencia del login
      const faceImageUrl = await this.saveFaceImage(
        faceImage,
        user.biometricData?.ra08PersonId || 'unknown',
        'LOGIN',
      );

      // Crear registro en historial
      await this.createLoginHistory(user.id, true, 'facial', {
        deviceKey: 'WEBCAM-LOCAL',
        searchScore: bestMatch.similarity / 100,
        livenessScore: bestMatch.confidence / 100,
        faceImageUrl,
      });

      // Generar tokens
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      console.log('✅ Login exitoso con AWS Rekognition');
      console.log(`   Usuario: ${user.email}`);
      console.log(`   Similitud: ${bestMatch.similarity.toFixed(2)}%`);
      console.log(`   Confianza: ${bestMatch.confidence.toFixed(2)}%`);
      console.log('═'.repeat(60) + '\n');

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900,
        user: this.sanitizeUser(user),
        biometricConfidence: {
          similarity: bestMatch.similarity,
          confidence: bestMatch.confidence,
          provider: 'AWS Rekognition',
          threshold: 85,
        },
      };
    } catch (error) {
      console.error('❌ Facial login failed:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Error en el proceso de login facial');
    }
  }

  /**
   * Registrar nuevo usuario con rostro
   */
  async registerFace(dto: RegisterFaceDto) {
    console.log('📝 Registering new face:', dto.email);

    try {
      // Verificar si el email ya existe
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new BadRequestException('El email ya está registrado');
      }

      // Generar PersonId único
      const personId = `P${Date.now().toString().slice(-6)}`;

      // Guardar imagen facial localmente
      const faceImageUrl = await this.saveFaceImage(
        dto.faceImage,
        personId,
        'REGISTRATION',
      );

      // Crear Practitioner si no es ADMIN
      let practitionerId: string | null = null;
      if (dto.role !== 'ADMIN' && dto.license) {
        const practitioner = await this.prisma.practitioner.create({
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            license: dto.license,
            specialty: dto.specialty || 'General',
          },
        });
        practitionerId = practitioner.id;
      }

      // Generar contraseña temporal
      const temporaryPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Crear Usuario
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: dto.role,
          practitionerId,
          isActive: true,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      // ==========================================
      // INDEXAR ROSTRO EN AWS REKOGNITION
      // ==========================================
      let awsFaceId: string | null = null;
      try {
        console.log('🔄 Indexando rostro en AWS Rekognition...');
        const rekognitionResult = await this.pythonBiometrics.registerFace(
          user.id,
          dto.faceImage,
        );

        if (rekognitionResult.success && rekognitionResult.faceId) {
          awsFaceId = rekognitionResult.faceId;
          console.log('✅ Rostro indexado en AWS Rekognition:', awsFaceId);
        } else {
          console.warn('⚠️ No se pudo indexar rostro en AWS:', rekognitionResult.message);
        }
      } catch (rekognitionError) {
        console.error('❌ Error indexando en AWS Rekognition:', rekognitionError);
        // Continuamos sin AWS - el usuario se crea pero sin reconocimiento facial
      }

      // Crear datos biométricos
      const biometric = await this.prisma.biometricData.create({
        data: {
          userId: user.id,
          ra08PersonId: personId,
          status: BiometricStatus.ACTIVE,
          ra08DeviceIds: ['WEBCAM-LOCAL'],
          facePhotos: [faceImageUrl],
          // awsFaceId se guardará cuando agreguemos el campo al schema
        },
      });

      console.log('✅ User registered successfully:', user.email);

      return {
        success: true,
        user: this.sanitizeUser(user),
        biometric: {
          ra08PersonId: biometric.ra08PersonId,
          status: biometric.status,
          awsFaceId: awsFaceId,
        },
        temporaryPassword, // Enviar contraseña temporal (en producción, enviar por email)
      };
    } catch (error) {
      console.error('Error registering face:', error);
      throw error;
    }
  }
}