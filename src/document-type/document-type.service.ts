import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../lib/prisma';

@Injectable()
export class DocumentTypeService {
  async findAll() {
    return prisma.document_type.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        evidence_strength: true,
        requires_mrz: true,
        supports_ocr: true,
        requires_original: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const documentType = await prisma.document_type.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        evidence_strength: true,
        requires_mrz: true,
        supports_ocr: true,
        requires_original: true,
      },
    });

    if (!documentType) {
      throw new NotFoundException('Type de document introuvable');
    }

    return documentType;
  }
}
