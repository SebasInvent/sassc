import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Servicio de Biometría Simplificado
 * 
 * Maneja el login facial usando los datos de Practitioner
 * Sin dependencias de modelos Prisma adicionales
 */
@Injectable()
export class BiometricService {
  private readonly logger = new Logger(BiometricService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los usuarios registrados con datos faciales
   */
  async getRegisteredUsers(): Promise<any[]> {
    this.logger.log('📋 Obteniendo usuarios registrados para verificación facial');
    
    const practitioners = await this.prisma.practitioner.findMany({
      where: {
        faceDescriptor: { not: null },
      },
      include: { user: true },
    });

    this.logger.log(`✅ Encontrados ${practitioners.length} usuarios con datos faciales`);

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

  /**
   * Busca un usuario por licencia
   */
  async findByLicense(license: string): Promise<any> {
    this.logger.log(`🔍 Buscando usuario con licencia: ${license}`);
    
    const practitioner = await this.prisma.practitioner.findFirst({
      where: { license },
      include: { user: true },
    });

    if (!practitioner) {
      this.logger.warn(`❌ No se encontró usuario con licencia: ${license}`);
      throw new NotFoundException('Usuario no encontrado');
    }

    this.logger.log(`✅ Usuario encontrado: ${practitioner.firstName} ${practitioner.lastName}`);

    return {
      id: practitioner.id,
      name: `${practitioner.firstName} ${practitioner.lastName}`,
      license: practitioner.license,
      specialty: practitioner.specialty,
      role: practitioner.user?.role || 'DOCTOR',
      userId: practitioner.user?.id,
    };
  }

  /**
   * Registra datos faciales para un practitioner
   */
  async registerFace(
    practitionerId: string, 
    faceDescriptor: string, 
    faceImage?: string
  ): Promise<any> {
    this.logger.log(`📝 Registrando datos faciales para: ${practitionerId}`);
    
    const updated = await this.prisma.practitioner.update({
      where: { id: practitionerId },
      data: {
        faceDescriptor,
        faceImage,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`✅ Datos faciales registrados para: ${updated.firstName} ${updated.lastName}`);

    return {
      success: true,
      practitionerId: updated.id,
      name: `${updated.firstName} ${updated.lastName}`,
    };
  }

  /**
   * Actualiza la última fecha de login biométrico
   */
  async updateLastBiometricLogin(practitionerId: string): Promise<void> {
    this.logger.log(`🔐 Actualizando último login biométrico: ${practitionerId}`);
    
    await this.prisma.practitioner.update({
      where: { id: practitionerId },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Obtiene estadísticas básicas
   */
  async getStats(): Promise<any> {
    const [total, withFace] = await Promise.all([
      this.prisma.practitioner.count(),
      this.prisma.practitioner.count({ 
        where: { 
          faceDescriptor: { not: null } 
        } 
      }),
    ]);

    return {
      totalPractitioners: total,
      withBiometricData: withFace,
      withoutBiometricData: total - withFace,
      registrationRate: total > 0 ? ((withFace / total) * 100).toFixed(1) : 0,
    };
  }
}
