import { IsString, IsNotEmpty, IsEmail, IsOptional, IsDateString, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { DocumentType, RegimenSalud } from '@prisma/client';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(DocumentType)
  @IsNotEmpty()
  docType: DocumentType;

  @IsString()
  @IsNotEmpty()
  docNumber: string;

  @IsDateString({}, { message: 'Fecha de nacimiento debe estar en formato ISO-8601 (YYYY-MM-DDTHH:mm:ss.sssZ)' })
  @IsNotEmpty()
  birthDate: string;

  @IsString()
  @IsOptional()
  gender?: string; // M, F, O

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // Dirección para territorialización
  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  // Información de salud
  @IsEnum(RegimenSalud)
  @IsOptional()
  regimen?: RegimenSalud;

  @IsString()
  @IsOptional()
  bloodType?: string; // A+, A-, B+, B-, AB+, AB-, O+, O-

  @IsString()
  @IsOptional()
  allergies?: string;

  // CAP asignado
  @IsString()
  @IsOptional()
  capAsignadoId?: string;

  // Biometría
  @IsBoolean()
  @IsOptional()
  biometricRegistered?: boolean;
}
