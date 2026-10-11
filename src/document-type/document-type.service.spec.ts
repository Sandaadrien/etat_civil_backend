import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { prisma } from '../lib/prisma';
import { DocumentTypeService } from './document-type.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    document_type: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  document_type: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
};

describe('DocumentTypeService', () => {
  let service: DocumentTypeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentTypeService],
    }).compile();

    service = module.get<DocumentTypeService>(DocumentTypeService);
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('retourne les types de documents triés par nom', async () => {
      const documentTypes = [
        { id: '1', name: 'CIN' },
        { id: '2', name: 'Passeport' },
      ];
      prismaMock.document_type.findMany.mockResolvedValue(documentTypes);

      const result = await service.findAll();

      expect(result).toEqual(documentTypes);
      expect(prismaMock.document_type.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          description: true,
          evidence_strength: true,
          requires_mrz: true,
          supports_ocr: true,
          requires_original: true,
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('retourne le type de document trouvé', async () => {
      const documentType = { id: '1', name: 'CIN' };
      prismaMock.document_type.findUnique.mockResolvedValue(documentType);

      const result = await service.findOne('1');

      expect(result).toEqual(documentType);
      expect(prismaMock.document_type.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
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
    });

    it('lance NotFoundException si le type est introuvable', async () => {
      prismaMock.document_type.findUnique.mockResolvedValue(null);

      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('unknown')).rejects.toThrow(
        'Type de document introuvable',
      );
    });
  });
});
