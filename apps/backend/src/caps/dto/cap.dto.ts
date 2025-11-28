import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateCapDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsNotEmpty()
  departamento: string;

  @IsString()
  @IsOptional()
  codigoPostal?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @IsOptional()
  poblacionAsignada?: number;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  horarioApertura?: string;

  @IsString()
  @IsOptional()
  horarioCierre?: string;

  @IsString()
  @IsOptional()
  diasOperacion?: string;

  @IsBoolean()
  @IsOptional()
  tieneOdontologia?: boolean;

  @IsBoolean()
  @IsOptional()
  tieneVacunacion?: boolean;

  @IsBoolean()
  @IsOptional()
  tieneLaboratorio?: boolean;

  @IsBoolean()
  @IsOptional()
  tieneUrgencias?: boolean;

  @IsString()
  @IsOptional()
  adresRegionalId?: string;
}

export class UpdateCapDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsString()
  @IsOptional()
  departamento?: string;

  @IsString()
  @IsOptional()
  codigoPostal?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @IsOptional()
  poblacionAsignada?: number;

  @IsNumber()
  @IsOptional()
  poblacionActual?: number;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  horarioApertura?: string;

  @IsString()
  @IsOptional()
  horarioCierre?: string;

  @IsString()
  @IsOptional()
  diasOperacion?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsBoolean()
  @IsOptional()
  tieneOdontologia?: boolean;

  @IsBoolean()
  @IsOptional()
  tieneVacunacion?: boolean;

  @IsBoolean()
  @IsOptional()
  tieneLaboratorio?: boolean;

  @IsBoolean()
  @IsOptional()
  tieneUrgencias?: boolean;

  @IsString()
  @IsOptional()
  adresRegionalId?: string;
}

export class AssignPersonalDto {
  @IsString()
  @IsNotEmpty()
  practitionerId: string;

  @IsString()
  @IsNotEmpty()
  cargo: string;

  @IsBoolean()
  @IsOptional()
  esDirector?: boolean;
}
