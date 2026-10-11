import { Controller, Get, Param } from '@nestjs/common';

import { DocumentTypeService } from './document-type.service';

@Controller('document-types')
export class DocumentTypeController {
  constructor(private readonly documentTypeService: DocumentTypeService) {}

  @Get()
  findAll() {
    return this.documentTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentTypeService.findOne(id);
  }
}
