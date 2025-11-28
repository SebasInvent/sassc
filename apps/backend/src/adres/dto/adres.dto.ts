import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, Min } from 'class-validator';

// --- ADRES Regional DTOs ---

export class CreateADRESRegionalDto {
  @IsString()
  codigo: string;

  @IsString()
  nombre: string;

  @IsString()
  departamento: string;

  @IsOptional()
  @IsNumber()
  presupuestoAnual?: number;

  @IsOptional()
  @IsString()
  director?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class UpdateADRESRegionalDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  presupuestoAnual?: number;

  @IsOptional()
  @IsNumber()
  presupuestoEjecutado?: number;

  @IsOptional()
  @IsString()
  director?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// --- Pago ADRES DTOs ---

export class CreatePagoDto {
  @IsString()
  adresRegionalId: string;

  @IsString()
  ipsDestinoId: string;

  @IsString()
  concepto: string;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsOptional()
  @IsString()
  numeroFactura?: string;

  @IsOptional()
  @IsString()
  periodo?: string;
}

export class UpdatePagoDto {
  @IsOptional()
  @IsString()
  estado?: string; // pendiente, procesado, rechazado

  @IsOptional()
  @IsString()
  concepto?: string;

  @IsOptional()
  @IsNumber()
  monto?: number;
}

export class ProcesarPagoDto {
  @IsString()
  estado: 'procesado' | 'rechazado';

  @IsOptional()
  @IsString()
  observacion?: string;
}

// --- Query DTOs ---

export class PagosQueryDto {
  @IsOptional()
  @IsString()
  adresRegionalId?: string;

  @IsOptional()
  @IsString()
  ipsDestinoId?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  periodo?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
