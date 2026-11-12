import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestActivationDto {
  @IsString()
  @IsNotEmpty()
  application_id: string = '';

  @IsEmail()
  email: string = '';
}
