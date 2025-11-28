import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateImagingResultDto {
  @IsString()
  @IsNotEmpty()
  orderId: string; // Cambiado de imagingOrderId a orderId

  @IsString()
  @IsNotEmpty()
  studyDate: string;

  @IsString()
  @IsNotEmpty()
  findings: string;

  @IsString()
  @IsNotEmpty()
  impression: string; // Cambiado a requerido (sin ?)

  @IsString()
  @IsOptional()
  recommendation?: string; // Agregado: recomendaciones

  @IsString()
  @IsOptional()
  status?: string; // Agregado: 'preliminary', 'final', 'amended'

  @IsArray()
  @IsOptional()
  imageUrls?: string[];

  @IsString()
  @IsOptional()
  reportedBy?: string;
}
