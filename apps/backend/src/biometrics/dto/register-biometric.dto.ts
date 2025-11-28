import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterBiometricDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  biometricType: string; // 'fingerprint' | 'facial' | 'iris'

  @IsString()
  @IsNotEmpty()
  biometricData: string; // Base64 encoded or reference ID

  @IsString()
  @IsOptional()
  externalSystemId?: string;

  @IsString()
  @IsOptional()
  quality?: string;
}
