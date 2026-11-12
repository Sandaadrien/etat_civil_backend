import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyActivationDto {
  @IsString()
  @IsNotEmpty()
  application_id: string = '';

  @IsEmail()
  email: string = '';

  @Matches(/^\d{6}$/, {
    message: 'Le code OTP doit contenir exactement 6 chiffres.',
  })
  otp: string = '';
}
