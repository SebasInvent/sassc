import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BiometricResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Operación completada exitosamente',
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
    description: 'Score de verificación (0.0 - 1.0)',
    example: 0.92,
  })
  verificationScore?: number;

  @ApiPropertyOptional({
    description: 'Datos adicionales de la respuesta',
  })
  data?: any;

  @ApiPropertyOptional({
    description: 'Código de error (si aplica)',
  })
  errorCode?: string;

  @ApiPropertyOptional({
    description: 'Timestamp de la operación',
  })
  timestamp?: Date;
}

export class BiometricStatsDto {
  @ApiProperty({
    description: 'Total de registros biométricos',
    example: 150,
  })
  totalRegistrations: number;

  @ApiProperty({
    description: 'Registros activos',
    example: 145,
  })
  activeRegistrations: number;

  @ApiProperty({
    description: 'Registros suspendidos',
    example: 3,
  })
  suspendedRegistrations: number;

  @ApiProperty({
    description: 'Registros revocados',
    example: 2,
  })
  revokedRegistrations: number;

  @ApiProperty({
    description: 'Total de verificaciones hoy',
    example: 87,
  })
  verificationsToday: number;

  @ApiProperty({
    description: 'Verificaciones exitosas hoy',
    example: 85,
  })
  successfulVerificationsToday: number;

  @ApiProperty({
    description: 'Verificaciones fallidas hoy',
    example: 2,
  })
  failedVerificationsToday: number;

  @ApiProperty({
    description: 'Dispositivos RA08 activos',
    example: 5,
  })
  activeRA08Devices: number;

  @ApiProperty({
    description: 'Dispositivos RA08 en línea',
    example: 4,
  })
  onlineRA08Devices: number;

  @ApiProperty({
    description: 'Última actualización',
  })
  lastUpdate: Date;
}

export class BiometricAuditDto {
  @ApiProperty({
    description: 'ID del log de auditoría',
  })
  id: string;

  @ApiProperty({
    description: 'Tipo de evento',
    example: 'LOGIN',
  })
  eventType: string;

  @ApiProperty({
    description: 'Resultado del evento',
    example: 'SUCCESS',
  })
  eventResult: string;

  @ApiPropertyOptional({
    description: 'Descripción del evento',
  })
  eventDescription?: string;

  @ApiPropertyOptional({
    description: 'Score de verificación',
    example: 0.92,
  })
  verificationScore?: number;

  @ApiPropertyOptional({
    description: 'Score de liveness',
    example: 0.95,
  })
  livenessScore?: number;

  @ApiPropertyOptional({
    description: 'ID del dispositivo',
  })
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Dirección IP',
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'Fecha del evento',
  })
  createdAt: Date;
}
