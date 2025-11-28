import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateLabResultDto {
  @IsString()
  @IsNotEmpty()
  orderId: string; // Cambiado de labOrderId a orderId

  @IsString()
  @IsNotEmpty()
  testCode: string;

  @IsString()
  @IsNotEmpty()
  testName: string;

  @IsString()
  @IsNotEmpty()
  result: string; // Agregado: valor del resultado

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  referenceRange?: string;

  @IsString()
  @IsOptional()
  status?: string; // Agregado: 'preliminary', 'final', etc.

  @IsString()
  @IsOptional()
  interpretation?: string;

  @IsDateString()
  @IsNotEmpty()
  resultDate: string;

  @IsString()
  @IsOptional()
  reportedBy?: string; // Cambiado de performedBy a reportedBy
}
