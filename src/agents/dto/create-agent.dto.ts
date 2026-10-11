import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { sex } from 'generated/prisma/enums';

export class CreateAgentDto {
  // Informations du compte Better Auth
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Informations de la personne
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  last_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  birth_place!: string;

  @IsOptional()
  @IsString()
  date_of_birth!: string;

  @IsUUID()
  country_of_birth_id!: string;

  @IsOptional()
  sex!: sex;

  // Affectation de l'agent
  @IsUUID()
  role_id!: string;

  @IsUUID()
  centre_id!: string;
}
