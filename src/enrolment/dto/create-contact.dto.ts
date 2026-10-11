import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { contact_type } from 'generated/prisma/enums';

export class CreateContactDto {
  @ApiProperty({
    enum: contact_type,
    example: contact_type.PHONE,
  })
  @IsEnum(contact_type)
  type!: contact_type;

  @ApiProperty({ example: '+261341234567' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_verified?: boolean;
}
