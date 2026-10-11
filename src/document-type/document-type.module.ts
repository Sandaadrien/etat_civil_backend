import { Module } from '@nestjs/common';

import { DocumentTypeController } from './document-type.controller';
import { DocumentTypeService } from './document-type.service';

@Module({
  controllers: [DocumentTypeController],
  providers: [DocumentTypeService],
})
export class DocumentTypeModule {}
