import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { EstadoRemision } from '@prisma/client';

export class CreateRemisionDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  capOrigenId: string;

  @IsString()
  @IsNotEmpty()
  ipsDestinoId: string;

  @IsString()
  @IsNotEmpty()
  diagnostico: string;

  @IsString()
  @IsNotEmpty()
  motivoRemision: string;

  @IsString()
  @IsNotEmpty()
  especialidadRequerida: string;

  @IsString()
  @IsOptional()
  prioridad?: string; // urgente, prioritario, normal

  @IsString()
  @IsOptional()
  notas?: string;

  @IsString()
  @IsOptional()
  medicoRemitenteId?: string;
}

export class UpdateRemisionDto {
  @IsEnum(EstadoRemision)
  @IsOptional()
  estado?: EstadoRemision;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsString()
  @IsOptional()
  resultadoAtencion?: string;

  @IsString()
  @IsOptional()
  ipsDestinoId?: string;
}

export class ApproveRemisionDto {
  @IsString()
  @IsOptional()
  notas?: string;
}

export class CompleteRemisionDto {
  @IsString()
  @IsNotEmpty()
  resultadoAtencion: string;

  @IsString()
  @IsOptional()
  notas?: string;
}
