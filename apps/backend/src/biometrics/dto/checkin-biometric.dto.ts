import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';

export enum CheckinType {
  ARRIVAL = 'ARRIVAL',
  DEPARTURE = 'DEPARTURE',
  APPOINTMENT = 'APPOINTMENT',
}

export class CheckinBiometricDto {
  @IsEnum(CheckinType)
  @IsNotEmpty()
  type: CheckinType;

  @IsString()
  @IsNotEmpty()
  faceImageBase64: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  locationName?: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckinBiometricResponseDto {
  success: boolean;
  message: string;
  isNotRegistered?: boolean;
  registrationUrl?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    docNumber: string;
    docType: string;
  };
  appointment?: {
    id: string;
    scheduledTime: Date;
    practitionerName: string;
    specialty: string;
  };
  verificationScore?: number;
  timestamp?: Date;
  checkinNumber?: number;
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
}
