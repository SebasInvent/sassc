import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.license);
  }


  @Get('test-licenses')
  async getTestLicenses() {
    const practitioners = await this.prisma.practitioner.findMany({
      take: 5,
      select: {
        license: true,
        firstName: true,
        lastName: true,
        specialty: true,
      },
    });
    return {
      message: 'Use any of these licenses to login',
      licenses: practitioners,
    };
  }

  // ============ FACIAL RECOGNITION ENDPOINTS ============

  /**
   * Obtener todos los usuarios con rostro registrado (para comparación en frontend)
   */
  @Get('registered-faces')
  async getRegisteredFaces() {
    const practitioners = await this.prisma.practitioner.findMany({
      where: {
        faceDescriptor: { not: null }
      },
      select: {
        id: true,
        license: true,
        firstName: true,
        lastName: true,
        specialty: true,
        faceDescriptor: true,
        faceImage: true,
      },
    });

    return {
      count: practitioners.length,
      users: practitioners.map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        license: p.license,
        specialty: p.specialty,
        descriptor: p.faceDescriptor,
        faceImage: p.faceImage,
      })),
    };
  }

  /**
   * Registrar rostro de un usuario existente
   */
  @Post('register-face')
  async registerFace(
    @Body() body: { license: string; faceDescriptor: string; faceImage?: string }
  ) {
    const { license, faceDescriptor, faceImage } = body;

    // Buscar practitioner por licencia
    const practitioner = await this.prisma.practitioner.findUnique({
      where: { license },
    });

    if (!practitioner) {
      throw new NotFoundException(`No se encontró usuario con licencia ${license}`);
    }

    // Actualizar con el descriptor facial
    const updated = await this.prisma.practitioner.update({
      where: { license },
      data: {
        faceDescriptor,
        faceImage: faceImage || null,
        faceRegisteredAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Rostro registrado correctamente',
      user: {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
        license: updated.license,
      },
    };
  }

  /**
   * Crear nuevo usuario con registro facial (licencia auto-generada)
   */
  @Post('register-new-user')
  async registerNewUser(
    @Body() body: { 
      firstName: string; 
      lastName: string; 
      email?: string;
      specialty?: string;
      role?: string;
      faceDescriptor: string; 
      faceImage?: string 
    }
  ) {
    const { firstName, lastName, email, specialty, role, faceDescriptor, faceImage } = body;

    // Generar licencia única según el rol
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    // Prefijo según rol
    let prefix = 'MP'; // Medical Professional por defecto
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') prefix = 'ADM';
    else if (role === 'NURSE') prefix = 'ENF';
    else if (role === 'PHARMACIST') prefix = 'FAR';
    else if (role === 'RECEPTIONIST') prefix = 'REC';
    
    const license = `${prefix}-${timestamp}${random}`;

    // Crear nuevo practitioner
    const practitioner = await this.prisma.practitioner.create({
      data: {
        license,
        firstName,
        lastName,
        specialty: specialty || role || 'General',
        faceDescriptor,
        faceImage: faceImage || null,
        faceRegisteredAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Usuario registrado correctamente',
      user: {
        id: practitioner.id,
        name: `${practitioner.firstName} ${practitioner.lastName}`,
        license: practitioner.license,
        specialty: practitioner.specialty,
        role: role || 'DOCTOR',
      },
    };
  }

  /**
   * Login por reconocimiento facial (sin licencia)
   */
  @Post('login-face')
  async loginByFace(@Body() body: { odescriptor: string }) {
    // Este endpoint recibe el descriptor del rostro capturado
    // La comparación se hace en el frontend por ahora
    // En producción, se haría aquí en el backend
    
    return {
      message: 'Use /registered-faces to get all faces and compare in frontend',
    };
  }

  /**
   * Verificar si un usuario tiene rostro registrado
   */
  @Get('has-face/:license')
  async hasFaceRegistered(@Param('license') license: string) {
    const practitioner = await this.prisma.practitioner.findUnique({
      where: { license },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        faceDescriptor: true,
        faceRegisteredAt: true,
      },
    });

    if (!practitioner) {
      throw new NotFoundException(`No se encontró usuario con licencia ${license}`);
    }

    return {
      hasface: !!practitioner.faceDescriptor,
      registeredAt: practitioner.faceRegisteredAt,
      user: {
        id: practitioner.id,
        name: `${practitioner.firstName} ${practitioner.lastName}`,
      },
    };
  }

  /**
   * Limpiar todos los datos faciales (solo desarrollo)
   */
  @Post('clear-all-faces')
  async clearAllFaces() {
    const result = await this.prisma.practitioner.updateMany({
      where: { faceDescriptor: { not: null } },
      data: {
        faceDescriptor: null,
        faceImage: null,
        faceRegisteredAt: null,
      },
    });

    return {
      success: true,
      message: `Se eliminaron los datos faciales de ${result.count} usuarios`,
      cleared: result.count,
    };
  }

  /**
   * Comparar rostros usando AWS Rekognition
   * Endpoint para verificación de identidad precisa
   */
  @Post('compare-faces')
  async compareFaces(
    @Body() body: { sourceImage: string; targetImage: string }
  ) {
    const { sourceImage, targetImage } = body;

    if (!sourceImage || !targetImage) {
      return {
        success: false,
        matched: false,
        similarity: 0,
        error: 'Se requieren sourceImage y targetImage',
      };
    }

    try {
      const client = new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });

      // Limpiar base64 (quitar prefijo data:image/...)
      const cleanSource = sourceImage.replace(/^data:image\/\w+;base64,/, '');
      const cleanTarget = targetImage.replace(/^data:image\/\w+;base64,/, '');

      const command = new CompareFacesCommand({
        SourceImage: { Bytes: Buffer.from(cleanSource, 'base64') },
        TargetImage: { Bytes: Buffer.from(cleanTarget, 'base64') },
        SimilarityThreshold: 70,
      });

      const response = await client.send(command);

      if (response.FaceMatches && response.FaceMatches.length > 0) {
        const similarity = response.FaceMatches[0].Similarity || 0;
        return {
          success: true,
          matched: similarity >= 80,
          similarity,
          confidence: similarity,
        };
      }

      return {
        success: true,
        matched: false,
        similarity: 0,
        confidence: 0,
        message: 'No se encontró coincidencia',
      };

    } catch (error: any) {
      console.error('AWS Rekognition error:', error.message);
      return {
        success: false,
        matched: false,
        similarity: 0,
        error: error.message,
      };
    }
  }

  /**
   * Comparar rostro contra todos los usuarios registrados
   * Retorna el usuario con mayor similitud
   */
  @Post('verify-face')
  async verifyFace(
    @Body() body: { faceImage: string }
  ) {
    const { faceImage } = body;

    if (!faceImage) {
      return {
        success: false,
        matched: false,
        user: null,
        error: 'Se requiere faceImage',
      };
    }

    // Obtener usuarios con imagen facial
    const users = await this.prisma.practitioner.findMany({
      where: { faceImage: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        license: true,
        specialty: true,
        faceImage: true,
      },
    });

    if (users.length === 0) {
      return {
        success: false,
        matched: false,
        user: null,
        error: 'No hay usuarios con rostro registrado',
      };
    }

    try {
      const client = new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });

      const cleanSource = faceImage.replace(/^data:image\/\w+;base64,/, '');
      let bestMatch: { user: any; similarity: number } | null = null;

      // Comparar con cada usuario
      for (const user of users) {
        try {
          const cleanTarget = user.faceImage!.replace(/^data:image\/\w+;base64,/, '');

          const command = new CompareFacesCommand({
            SourceImage: { Bytes: Buffer.from(cleanSource, 'base64') },
            TargetImage: { Bytes: Buffer.from(cleanTarget, 'base64') },
            SimilarityThreshold: 70,
          });

          const response = await client.send(command);

          if (response.FaceMatches && response.FaceMatches.length > 0) {
            const similarity = response.FaceMatches[0].Similarity || 0;
            if (!bestMatch || similarity > bestMatch.similarity) {
              bestMatch = {
                user: {
                  id: user.id,
                  name: `${user.firstName} ${user.lastName}`,
                  license: user.license,
                  specialty: user.specialty,
                },
                similarity,
              };
            }
          }
        } catch (e) {
          // Continuar con el siguiente usuario si hay error
          console.warn(`Error comparing with user ${user.id}:`, e);
        }
      }

      // Umbral de 75% para tolerar diferencias entre cámaras (PC vs móvil)
      if (bestMatch && bestMatch.similarity >= 75) {
        return {
          success: true,
          matched: true,
          user: bestMatch.user,
          similarity: bestMatch.similarity,
          confidence: bestMatch.similarity,
        };
      }

      return {
        success: true,
        matched: false,
        user: null,
        similarity: bestMatch?.similarity || 0,
        message: `No se encontró coincidencia suficiente (mejor: ${bestMatch?.similarity?.toFixed(1) || 0}%)`,
      };

    } catch (error: any) {
      console.error('AWS Rekognition error:', error.message);
      return {
        success: false,
        matched: false,
        user: null,
        error: error.message,
      };
    }
  }
}