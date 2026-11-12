import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('documents')
  @UseInterceptors(
    FilesInterceptor('file', 10, {
      storage: memoryStorage(),

      limits: {
        fileSize: 15 * 1024 * 1024, // 15 Mo par fichier
        files: 10, // Maximum 10 fichiers
      },

      fileFilter: (_req, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `Format non autorisé : ${file.mimetype}. Formats acceptés : JPEG, PNG, WEBP et PDF.`,
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadDocuments(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Veuillez envoyer au moins un fichier.');
    }

    // Enregistrement de tous les documents
    const documents = await Promise.all(
      files.map((file) => this.uploadsService.saveDocument(file)),
    );

    return {
      message: 'Documents enregistrés avec succès.',
      total: documents.length,
      documents,
    };
  }
}
