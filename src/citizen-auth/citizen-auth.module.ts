import { Module } from '@nestjs/common';
import { CitizenAuthService } from './citizen-auth.service';
import { CitizenAuthController } from './citizen-auth.controller';

@Module({
  providers: [CitizenAuthService],
  controllers: [CitizenAuthController],
  exports: [CitizenAuthService],
})
export class CitizenAuthModule {}
