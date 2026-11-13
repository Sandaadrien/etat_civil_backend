import { Module } from '@nestjs/common';
import { PersonneController } from './personne.controller';
import { PersonneService } from './personne.service';

@Module({
  controllers: [PersonneController],
  providers: [PersonneService],
  exports: [PersonneService],
})
export class PersonneModule {}
