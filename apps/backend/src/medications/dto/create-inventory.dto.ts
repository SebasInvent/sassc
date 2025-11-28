import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  @IsNotEmpty()
  medicationCode: string;

  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @IsString()
  @IsNotEmpty()
  presentation: string; // ej: "Tabletas 500mg"

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  quantityUnit: string; // ej: "tabletas", "frascos"

  @IsInt()
  @Min(0)
  @IsOptional()
  minQuantity?: number;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsDateString({}, { message: 'Fecha de vencimiento debe estar en formato ISO-8601 (YYYY-MM-DDTHH:mm:ss.sssZ)' })
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @IsDateString({}, { message: 'Fecha de último reabastecimiento debe estar en formato ISO-8601' })
  @IsOptional()
  lastRestockDate?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;
}
