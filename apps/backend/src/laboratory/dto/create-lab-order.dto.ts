import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateLabOrderDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  encounterId: string;

  @IsString()
  @IsNotEmpty()
  practitionerId: string;

  @IsArray()
  @IsNotEmpty()
  testCodes: string[];

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
