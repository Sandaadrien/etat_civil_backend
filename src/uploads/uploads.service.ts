import { BadRequestException, Injectable } from '@nestjs/common';

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class UploadsService {
  private readonly uploadDirectory = join(
    process.cwd(),
    'private-uploads',
    'documents',
  );

  async saveDocument(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Aucun fichier reçu');
    }

    const extensionByMimeType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };

    const extension = extensionByMimeType[file.mimetype];

    if (!extension) {
      throw new BadRequestException('Format de fichier non autorisé');
    }

    // Vérification basique de la signature du fichier.
    // Le MIME déclaré seul n'est pas une preuve suffisante.
    const buffer = file.buffer;

    const isJpeg =
      file.mimetype === 'image/jpeg' &&
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPng =
      file.mimetype === 'image/png' &&
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    const isWebp =
      file.mimetype === 'image/webp' &&
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';

    const isPdf =
      file.mimetype === 'application/pdf' &&
      buffer.subarray(0, 5).toString('ascii') === '%PDF-';

    if (!(isJpeg || isPng || isWebp || isPdf)) {
      throw new BadRequestException(
        'Le contenu du fichier ne correspond pas à son format',
      );
    }

    await mkdir(this.uploadDirectory, {
      recursive: true,
    });

    const filename = `${randomUUID()}${extension}`;
    const storageKey = `documents/${filename}`;
    const absolutePath = join(this.uploadDirectory, filename);

    await writeFile(absolutePath, buffer, {
      flag: 'wx',
      mode: 0o600,
    });

    const checksum = createHash('sha256').update(buffer).digest('hex');

    return {
      storage_key: storageKey,
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size: buffer.length,
      checksum,
    };
  }
}
