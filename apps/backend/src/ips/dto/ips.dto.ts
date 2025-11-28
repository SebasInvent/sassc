import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { NivelComplejidad } from '@prisma/client';

export class CreateIpsDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  tipo: string; // hospital, clinica, laboratorio, centro_imagenes

  @IsEnum(NivelComplejidad)
  @IsOptional()
  nivelComplejidad?: NivelComplejidad;

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

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsNumber()
  @IsOptional()
  numeroCamas?: number;

  @IsNumber()
  @IsOptional()
  numeroQuirofanos?: number;

  @IsNumber()
  @IsOptional()
  numeroUCI?: number;

  @IsArray()
  @IsOptional()
  servicios?: string[];

  @IsString()
  @IsOptional()
  adresRegionalId?: string;
}

export class UpdateIpsDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  tipo?: string;

  @IsEnum(NivelComplejidad)
  @IsOptional()
  nivelComplejidad?: NivelComplejidad;

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

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsNumber()
  @IsOptional()
  numeroCamas?: number;

  @IsNumber()
  @IsOptional()
  numeroQuirofanos?: number;

  @IsNumber()
  @IsOptional()
  numeroUCI?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsArray()
  @IsOptional()
  servicios?: string[];

  @IsString()
  @IsOptional()
  adresRegionalId?: string;
}

export class AssignPersonalIpsDto {
  @IsString()
  @IsNotEmpty()
  practitionerId: string;

  @IsString()
  @IsNotEmpty()
  cargo: string;

  @IsString()
  @IsOptional()
  especialidad?: string;

  @IsBoolean()
  @IsOptional()
  esDirector?: boolean;
}
