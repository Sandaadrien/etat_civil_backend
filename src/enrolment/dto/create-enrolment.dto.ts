import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { enrolment_type } from 'generated/prisma/enums';

import { CreatePersonDto } from './create-person.dto';
import { CreateAddressDto } from './create-address.dto';
import { CreateContactDto } from './create-contact.dto';
import { CreateFamilyRelationshipDto } from './create-family-relationship.dto';
import { CreateDocumentDto } from './create-document.dto';
import { CreateFaceBiometricDto } from './create-face-biometric.dto';

export class CreateEnrolmentDto {
  @ApiProperty({ type: CreatePersonDto })
  @ValidateNested()
  @Type(() => CreatePersonDto)
  person!: CreatePersonDto;

  @ApiProperty({ type: CreateAddressDto })
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address!: CreateAddressDto;

  @ApiPropertyOptional({ type: [CreateContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContactDto)
  contacts?: CreateContactDto[];

  @ApiPropertyOptional({ type: [CreateFamilyRelationshipDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFamilyRelationshipDto)
  relationships?: CreateFamilyRelationshipDto[];

  @ApiProperty({ type: [CreateDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentDto)
  documents!: CreateDocumentDto[];

  @ApiPropertyOptional({ type: [CreateFaceBiometricDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFaceBiometricDto)
  face_biometrics?: CreateFaceBiometricDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  created_offline?: boolean;

  @ApiPropertyOptional({
    enum: enrolment_type,
    example: enrolment_type.NEW,
  })
  @IsOptional()
  @IsEnum(enrolment_type)
  enrolment_type?: enrolment_type;
}
