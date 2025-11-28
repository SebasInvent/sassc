import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateConditionDto {
  @IsString()
  @IsNotEmpty()
  clinicalStatus: string;

  @IsString()
  @IsNotEmpty()
  verificationStatus: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  encounterId: string;
}