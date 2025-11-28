import { IsString, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  practitionerId: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsDateString({}, { message: 'Fecha de inicio debe estar en formato ISO-8601' })
  start: string;

  @IsDateString({}, { message: 'Fecha de fin debe estar en formato ISO-8601' })
  end: string;

  @IsString()
  modality: string;
}