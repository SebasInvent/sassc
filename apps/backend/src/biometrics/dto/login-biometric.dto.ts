import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum BiometricLoginMethod {
  FACIAL = 'FACIAL',
  FINGERPRINT = 'FINGERPRINT',
  BOTH = 'BOTH',
}

export class LoginBiometricDto {
  @IsEnum(BiometricLoginMethod)
  @IsNotEmpty()
  method: BiometricLoginMethod;

  @IsString()
  @IsOptional()
  faceImageBase64?: string;

  @IsString()
  @IsOptional()
  fingerprintTemplate?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidenceThreshold?: number;

  @IsOptional()
  requireLiveness?: boolean;

  @IsOptional()
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    platform?: string;
  };
}

export class LoginBiometricResponseDto {
  success: boolean;
  message: string;
  isNotRegistered?: boolean;
  registrationUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  verificationScore?: number;
  livenessScore?: number;
  method?: BiometricLoginMethod;
  timestamp?: Date;
}
