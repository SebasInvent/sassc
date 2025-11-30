import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(license: string) {
    console.log('🔍 Login attempt with license:', license);
    
    const practitioner = await this.prisma.practitioner.findUnique({
      where: { license },
      include: { user: true },
    });
    
    console.log('🔍 Practitioner found:', JSON.stringify(practitioner));
    
    if (!practitioner) {
      console.log('❌ Practitioner NOT found');
      throw new UnauthorizedException('Licencia no encontrada o incorrecta.');
    }
    
    if (!practitioner.firstName || !practitioner.lastName) {
      console.error('❌ Practitioner missing firstName or lastName:', practitioner);
      throw new UnauthorizedException('Datos del profesional incompletos.');
    }
    
    console.log('✅ Practitioner OK, creating response...');
    
    // Obtener rol del usuario asociado o asignar por defecto
    const role = practitioner.user?.role || 'DOCTOR';
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

  async validateUser(payload: any) {
    const practitioner = await this.prisma.practitioner.findUnique({
      where: { id: payload.sub },
      include: { user: true },
    });
    
    if (!practitioner) {
      throw new UnauthorizedException('Usuario no válido');
    }
    
    return {
      id: practitioner.id,
      name: `${practitioner.firstName} ${practitioner.lastName}`,
      license: practitioner.license,
      specialty: practitioner.specialty,
      role: practitioner.user?.role || 'DOCTOR',
    };
  }

  async getRegisteredUsers() {
    console.log('📋 Getting registered users for facial recognition');
    
    const practitioners = await this.prisma.practitioner.findMany({
      where: {
        faceDescriptor: { not: null },
      },
      include: { user: true },
    });

    console.log(`✅ Found ${practitioners.length} users with facial data`);

    return practitioners.map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      license: p.license,
      specialty: p.specialty,
      descriptor: p.faceDescriptor,
      faceImage: p.faceImage,
      role: p.user?.role || 'DOCTOR',
    }));
  }

  async registerFace(practitionerId: string, faceDescriptor: string, faceImage?: string) {
    console.log(`📝 Registering face for practitioner: ${practitionerId}`);
    
    const updated = await this.prisma.practitioner.update({
      where: { id: practitionerId },
      data: {
        faceDescriptor,
        faceImage,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Face registered for: ${updated.firstName} ${updated.lastName}`);

    return {
      success: true,
      practitionerId: updated.id,
      name: `${updated.firstName} ${updated.lastName}`,
    };
  }
}
