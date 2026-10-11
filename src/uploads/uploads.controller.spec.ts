import { Test, TestingModule } from '@nestjs/testing';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('UploadsController', () => {
  let controller: UploadsController;
  let service: { saveDocument: jest.Mock };

  beforeEach(async () => {
    service = { saveDocument: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [{ provide: UploadsService, useValue: service }],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
  });

  it('doit être défini', () => {
    expect(controller).toBeDefined();
  });

  it('uploadDocument délègue le fichier au service', async () => {
    const file = { originalname: 'a.png' } as Express.Multer.File;
    service.saveDocument.mockResolvedValue({ storage_key: 'k' });

    await expect(controller.uploadDocument(file)).resolves.toEqual({
      storage_key: 'k',
    });
    expect(service.saveDocument).toHaveBeenCalledWith(file);
  });
});
