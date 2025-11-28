import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateImagingOrderDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  encounterId: string;

  @IsString()
  @IsNotEmpty()
  practitionerId: string;

  @IsString()
  @IsNotEmpty()
  studyType: string; // 'X-Ray', 'CT', 'MRI', 'Ultrasound'

  @IsString()
  @IsNotEmpty()
  bodyPart: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  clinicalIndication?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
