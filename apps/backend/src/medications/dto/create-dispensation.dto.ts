import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt } from 'class-validator';

export class CreateDispensationDto {
  @IsString()
  @IsNotEmpty()
  prescriptionId: string;

  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  quantityUnit: string; // ej: "tabletas", "ml", "cápsulas"

  @IsString()
  @IsOptional()
  dispenserId?: string; // ID del farmacéutico que dispensa

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string; // 'completed', 'partial', 'cancelled'
}
