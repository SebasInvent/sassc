import { IsString, IsNotEmpty, IsNumber, IsOptional, ValidateIf } from 'class-validator';

export class CreateObservationDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsOptional()
  valueQuantity?: number;

  @IsString()
  @IsOptional()
  valueUnit?: string;

  @IsString()
  @IsOptional()
  valueString?: string;

  @IsString()
  @IsNotEmpty()
  encounterId: string;
}