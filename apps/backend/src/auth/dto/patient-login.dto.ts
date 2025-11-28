import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class PatientLoginDto {
  @IsEnum(DocumentType)
  @IsNotEmpty()
  docType: DocumentType;

  @IsString()
  @IsNotEmpty()
  docNumber: string;
}