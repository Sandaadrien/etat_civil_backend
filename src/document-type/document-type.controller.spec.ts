import { Test, TestingModule } from '@nestjs/testing';

import { DocumentTypeController } from './document-type.controller';
import { DocumentTypeService } from './document-type.service';

jest.mock('../lib/prisma', () => ({ prisma: {} }));

describe('DocumentTypeController', () => {
  let controller: DocumentTypeController;
  let service: { findAll: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentTypeController],
      providers: [{ provide: DocumentTypeService, useValue: service }],
    }).compile();

    controller = module.get<DocumentTypeController>(DocumentTypeController);
  });

  it('findAll délègue au service', async () => {
    service.findAll.mockResolvedValue(['a']);

    await expect(controller.findAll()).resolves.toEqual(['a']);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('findOne délègue au service avec l’id', async () => {
    service.findOne.mockResolvedValue({ id: '1' });

    await expect(controller.findOne('1')).resolves.toEqual({ id: '1' });
    expect(service.findOne).toHaveBeenCalledWith('1');
  });
});
