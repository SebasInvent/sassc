import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class FacialRecognitionDto {
  @IsString()
  @IsNotEmpty()
  imageData: string; // Base64 encoded image

  @IsString()
  @IsOptional()
  captureDevice?: string;

  @IsString()
  @IsOptional()
  confidence?: string;
}
