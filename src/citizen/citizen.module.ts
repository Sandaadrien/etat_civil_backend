import { Module } from '@nestjs/common';
import { CitizenService } from './citizen.service';
import { CitizenController } from './citizen.controller';

@Module({
  providers: [CitizenService],
  controllers: [CitizenController],
  exports: [CitizenService],
})
export class CitizenModule {}
