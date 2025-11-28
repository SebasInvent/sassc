import { IsNotEmpty, IsString } from 'class-validator';

export class TriageDto {
  @IsString()
  @IsNotEmpty()
  practitionerId: string;

  // En un futuro, aquí irían los datos del triage como NEWS2/ESI
  // @IsObject()
  // triageData: any;
}