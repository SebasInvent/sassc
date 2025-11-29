import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CheckinType {
  ARRIVAL = 'ARRIVAL',
  DEPARTURE = 'DEPARTURE',
  APPOINTMENT = 'APPOINTMENT',
}

export class CheckinBiometricDto {
  @ApiProperty({
    description: 'Tipo de check-in',
    enum: CheckinType,
    example: CheckinType.ARRIVAL,
  })
  @IsEnum(CheckinType)
  @IsNotEmpty()
  type: CheckinType;

  @ApiProperty({
    description: 'Imagen facial en base64 para verificación',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsNotEmpty()
  faceImageBase64: string;

  @ApiPropertyOptional({
    description: 'ID del dispositivo RA08',
    example: 'RA08-ENTRANCE-01',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'ID de la cita (si aplica)',
    example: 'cuid123456',
  })
  @IsString()
  @IsOptional()
  appointmentId?: string;

  @ApiPropertyOptional({
    description: 'Ubicación del check-in - Latitud',
    example: 4.6097,
  })
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Ubicación del check-in - Longitud',
    example: -74.0817,
  })
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Nombre de la ubicación',
    example: 'Recepción Principal',
  })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiPropertyOptional({
    description: 'Temperatura corporal (si está disponible)',
    example: 36.5,
  })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckinBiometricResponseDto {
  @ApiProperty({
    description: 'Indica si el check-in fue exitoso',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Check-in exitoso',
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
    description: 'Datos del paciente identificado',
  })
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    docNumber: string;
    docType: string;
  };

  @ApiPropertyOptional({
    description: 'Datos de la cita (si aplica)',
  })
  appointment?: {
    id: string;
    scheduledTime: Date;
    practitionerName: string;
    specialty: string;
  };

  @ApiPropertyOptional({
    description: 'Score de verificación facial (0.0 - 1.0)',
    example: 0.94,
  })
  verificationScore?: number;

  @ApiPropertyOptional({
    description: 'Timestamp del check-in',
  })
  timestamp?: Date;

  @ApiPropertyOptional({
    description: 'Número de check-in del día',
    example: 1,
  })
  checkinNumber?: number;

  @ApiPropertyOptional({
    description: 'Ubicación del check-in',
  })
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
}
