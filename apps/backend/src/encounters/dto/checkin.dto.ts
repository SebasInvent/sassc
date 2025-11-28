import { IsNotEmpty, IsString } from 'class-validator';

export class CheckinDto {
  @IsString()
  @IsNotEmpty()
  appointmentId: string
}