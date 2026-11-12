import { Module } from '@nestjs/common';

import { ActivationController } from './activation.controller';
import { ActivationService } from './activation.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [ActivationController],
  providers: [ActivationService],
})
export class ActivationModule {}
