import { Body, Controller, Post } from '@nestjs/common';

import { ActivationService } from './activation.service';

import { RequestActivationDto } from './dto/request-activation.dto';
import { VerifyActivationDto } from './dto/verify-activation.dto';
import { CompleteActivationDto } from './dto/complete-activation.dto';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('activation')
@AllowAnonymous()
export class ActivationController {
  constructor(private readonly activationService: ActivationService) {}

  @Post('request')
  requestActivation(@Body() dto: RequestActivationDto) {
    return this.activationService.requestActivation(dto);
  }

  @Post('verify')
  verifyActivation(@Body() dto: VerifyActivationDto) {
    return this.activationService.verifyActivation(dto);
  }

  @Post('complete')
  completeActivation(@Body() dto: CompleteActivationDto) {
    return this.activationService.completeActivation(dto);
  }
}
