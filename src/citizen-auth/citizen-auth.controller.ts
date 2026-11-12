import { Body, Controller, Post, Req } from '@nestjs/common';

import type { Request } from 'express';

import { CitizenAuthService } from './citizen-auth.service';
import { CitizenLoginDto } from './dto/citizen-login.dto';

@Controller('citizen/auth')
export class CitizenAuthController {
  constructor(private readonly citizenAuthService: CitizenAuthService) {}

  @Post('login')
  async login(@Body() dto: CitizenLoginDto, @Req() req: Request) {
    return this.citizenAuthService.login(
      dto.email,
      dto.password,
      new Headers(req.headers as Record<string, string>),
    );
  }
}
