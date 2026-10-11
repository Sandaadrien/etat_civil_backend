import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { sex } from 'generated/prisma/enums';

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  last_name?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  birth_place?: string;

  @IsOptional()
  @IsUUID()
  country_of_birth_id?: string;

  @IsOptional()
  @IsEnum(sex)
  sex?: sex;

  @IsOptional()
  @IsUUID()
  role_id?: string;

  @IsOptional()
  @IsUUID()
  centre_id?: string;
}
