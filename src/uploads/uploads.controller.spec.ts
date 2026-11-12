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

  it('uploadDocuments délègue les fichiers au service', async () => {
    const files = [{ originalname: 'a.png' }] as Express.Multer.File[];
    service.saveDocument.mockResolvedValue({ storage_key: 'k' });

    await expect(controller.uploadDocuments(files)).resolves.toEqual({
      message: 'Documents enregistrés avec succès.',
      total: 1,
      documents: [{ storage_key: 'k' }],
    });
    expect(service.saveDocument).toHaveBeenCalledWith(files[0]);
  });

  it('uploadDocuments rejette si aucun fichier n’est fourni', async () => {
    await expect(controller.uploadDocuments([])).rejects.toThrow(
      'Veuillez envoyer au moins un fichier.',
    );
  });
});
