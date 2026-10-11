import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaceBiometricDto {
  @ApiProperty({ example: 'faces/person-123.jpg' })
  @IsString()
  image_file_path!: string;

  @ApiPropertyOptional({ example: 'FaceNet' })
  @IsOptional()
  @IsString()
  model_name?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  model_version?: string;

  @ApiProperty({ example: '[0.123,0.456,0.789]' })
  @IsString()
  embedding!: string;

  @ApiPropertyOptional({ example: 98.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quality_score?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  face_detected?: boolean;
}
