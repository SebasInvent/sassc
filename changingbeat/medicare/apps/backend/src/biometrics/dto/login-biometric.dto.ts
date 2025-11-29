import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BiometricLoginMethod {
  FACIAL = 'FACIAL',
  FINGERPRINT = 'FINGERPRINT',
  BOTH = 'BOTH',
}

export class LoginBiometricDto {
  @ApiProperty({
    description: 'Método de autenticación biométrica',
    enum: BiometricLoginMethod,
    example: BiometricLoginMethod.FACIAL,
  })
  @IsEnum(BiometricLoginMethod)
  @IsNotEmpty()
  method: BiometricLoginMethod;

  @ApiPropertyOptional({
    description: 'Imagen facial en base64 (requerido si method es FACIAL o BOTH)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsOptional()
  faceImageBase64?: string;

  @ApiPropertyOptional({
    description: 'Template de huella dactilar (requerido si method es FINGERPRINT o BOTH)',
  })
  @IsString()
  @IsOptional()
  fingerprintTemplate?: string;

  @ApiPropertyOptional({
    description: 'ID del dispositivo RA08 que realiza el login',
    example: 'RA08-001',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Score de confianza mínimo requerido (0.0 - 1.0)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidenceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Verificar liveness (detección de vida)',
    example: true,
  })
  @IsOptional()
  requireLiveness?: boolean;

  @ApiPropertyOptional({
    description: 'Información del dispositivo cliente',
  })
  @IsOptional()
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    platform?: string;
  };
}

export class LoginBiometricResponseDto {
  @ApiProperty({
    description: 'Indica si el login fue exitoso',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Login exitoso',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Indica si la persona no está registrada en el sistema',
    example: false,
  })
  isNotRegistered?: boolean;

  @ApiPropertyOptional({
    description: 'URL para el registro si la persona no está registrada',
    example: '/auth/register',
  })
  registrationUrl?: string;

  @ApiPropertyOptional({
    description: 'Token JWT de acceso',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Token de refresh',
  })
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Datos del usuario autenticado',
  })
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };

  @ApiPropertyOptional({
    description: 'Score de confianza de la verificación (0.0 - 1.0)',
    example: 0.92,
  })
  verificationScore?: number;

  @ApiPropertyOptional({
    description: 'Score de liveness (0.0 - 1.0)',
    example: 0.95,
  })
  livenessScore?: number;

  @ApiPropertyOptional({
    description: 'Método utilizado para el login',
    enum: BiometricLoginMethod,
  })
  method?: BiometricLoginMethod;

  @ApiPropertyOptional({
    description: 'Timestamp del login',
  })
  timestamp?: Date;
}
