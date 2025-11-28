import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PatientLoginDto } from './dto/patient-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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
    
    // Asignar rol basado en la licencia o especialidad
    let role = 'MEDICO_CAP'; // Por defecto, médico de CAP
    
    // Roles específicos por licencia
    if (license === 'MP-43423635') role = 'ADMIN';
    else if (license === 'MP-11223344') role = 'NURSE';
    else if (license === 'MP-55667788') role = 'PHARMACIST';
    else if (license === 'MP-99887766') role = 'RADIOLOGIST';
    
    // Roles por especialidad
    const specialty = practitioner.specialty?.toLowerCase() || '';
    if (specialty.includes('director') || specialty.includes('gerente')) {
      role = 'DIRECTOR_IPS';
    } else if (specialty.includes('admin')) {
      role = 'ADMIN';
    }
    
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
}