import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { document_file_side } from 'generated/prisma/enums';

export class CreateDocumentFileDto {
  @ApiProperty({
    enum: document_file_side,
    example: document_file_side.FRONT,
  })
  @IsEnum(document_file_side)
  side!: document_file_side;

  @ApiProperty({ example: 'documents/abc123/front.png' })
  @IsString()
  storage_key!: string;

  @ApiPropertyOptional({ example: 'front.png' })
  @IsOptional()
  @IsString()
  original_filename?: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  mime_type!: string;

  @ApiProperty({ example: 245000 })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  file_size!: number;

  @ApiPropertyOptional({ example: 'sha256-checksum' })
  @IsOptional()
  @IsString()
  checksum?: string;
}

export class CreateDocumentDto {
  @ApiProperty({
    example: '756c47a4-0409-4d0d-8aa9-125c05b76813',
  })
  @IsUUID()
  document_type_id!: string;

  @ApiProperty({ type: [CreateDocumentFileDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentFileDto)
  files!: CreateDocumentFileDto[];
}
