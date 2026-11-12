import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CompleteActivationDto {
  @IsString()
  @IsNotEmpty()
  application_id: string = '';

  @IsEmail()
  email: string = '';

  @IsString()
  @MinLength(8)
  password: string = '';
}
