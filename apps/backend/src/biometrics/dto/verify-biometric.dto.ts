import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyBiometricDto {
  @IsString()
  @IsNotEmpty()
  biometricType: string; // 'fingerprint' | 'facial' | 'iris'

  @IsString()
  @IsNotEmpty()
  biometricData: string; // Base64 encoded or captured data
}
