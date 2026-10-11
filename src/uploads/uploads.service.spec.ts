import { BadRequestException } from '@nestjs/common';

import { mkdir, writeFile } from 'node:fs/promises';

import { UploadsService } from './uploads.service';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

const mkdirMock = mkdir as unknown as jest.Mock;
const writeFileMock = writeFile as unknown as jest.Mock;

function buildFile(
  mimetype: string,
  buffer: Buffer,
  originalname = 'document',
): Express.Multer.File {
  return {
    originalname,
    mimetype,
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const pngBuffer = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0x00]),
]);
const webpBuffer = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP'),
]);
const pdfBuffer = Buffer.from('%PDF-1.7');

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UploadsService();
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('saveDocument', () => {
    it('lance BadRequestException si aucun fichier n’est fourni', async () => {
      await expect(
        service.saveDocument(undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.saveDocument(undefined as unknown as Express.Multer.File),
      ).rejects.toThrow('Aucun fichier reçu');
    });

    it('lance BadRequestException si le buffer est vide', async () => {
      const file = buildFile('image/png', Buffer.alloc(0));

      await expect(service.saveDocument(file)).rejects.toThrow(
        'Aucun fichier reçu',
      );
    });

    it('lance BadRequestException pour un format non autorisé', async () => {
      const file = buildFile('text/plain', Buffer.from('hello'));

      await expect(service.saveDocument(file)).rejects.toThrow(
        'Format de fichier non autorisé',
      );
      expect(mkdirMock).not.toHaveBeenCalled();
    });

    it('lance BadRequestException si la signature ne correspond pas au MIME', async () => {
      const file = buildFile('image/png', jpegBuffer);

      await expect(service.saveDocument(file)).rejects.toThrow(
        'Le contenu du fichier ne correspond pas à son format',
      );
    });

    it('enregistre un JPEG valide et retourne les métadonnées', async () => {
      const file = buildFile('image/jpeg', jpegBuffer, 'photo.jpg');

      const result = await service.saveDocument(file);

      expect(mkdirMock).toHaveBeenCalledTimes(1);
      expect(writeFileMock).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        original_filename: 'photo.jpg',
        mime_type: 'image/jpeg',
        file_size: jpegBuffer.length,
      });
      expect(result.storage_key).toMatch(/^documents\/.+\.jpg$/);
      expect(result.checksum).toMatch(/^[0-9a-f]{64}$/);
    });

    it('enregistre un PNG valide', async () => {
      const file = buildFile('image/png', pngBuffer, 'image.png');

      const result = await service.saveDocument(file);

      expect(result.storage_key).toMatch(/^documents\/.+\.png$/);
      expect(result.mime_type).toBe('image/png');
    });

    it('enregistre un WEBP valide', async () => {
      const file = buildFile('image/webp', webpBuffer, 'image.webp');

      const result = await service.saveDocument(file);

      expect(result.storage_key).toMatch(/^documents\/.+\.webp$/);
    });

    it('enregistre un PDF valide', async () => {
      const file = buildFile('application/pdf', pdfBuffer, 'doc.pdf');

      const result = await service.saveDocument(file);

      expect(result.storage_key).toMatch(/^documents\/.+\.pdf$/);
      expect(result.file_size).toBe(pdfBuffer.length);
    });
  });
});
