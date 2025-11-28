import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateAuthorizationDto {
  @IsString()
  @IsNotEmpty()
  prescriptionId: string;

  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  requesterId: string; // Médico que solicita

  @IsString()
  @IsNotEmpty()
  justification: string; // Justificación médica

  @IsString()
  @IsNotEmpty()
  diagnosis: string; // Diagnóstico asociado

  @IsString()
  @IsOptional()
  treatmentPlan?: string;

  @IsString()
  @IsOptional()
  priority?: string; // 'urgent' o 'routine'

  @IsNumber()
  @IsOptional()
  estimatedCost?: number;

  @IsString()
  @IsOptional()
  insuranceEntity?: string; // EPS o entidad

  @IsString()
  @IsOptional()
  notes?: string;
}
