import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';

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
}