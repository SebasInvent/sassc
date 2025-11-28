import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  license: string;

  // En un futuro, aquí iría la contraseña.
  // @IsString()
  // @IsNotEmpty()
  // password?: string;
}