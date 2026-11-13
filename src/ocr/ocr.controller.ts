
import {
  BadGatewayException,
  BadRequestException,
  Controller,
  ForbiddenException,
  HttpException,
  PayloadTooLargeException,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { memoryStorage } from 'multer';

import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';

import { UseGuards } from '@nestjs/common';
import { OcrAuthGuard } from './ocr-auth.guard';

const MAX_OCR_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/pdf',
];

@AllowAnonymous()
@Controller('ocr')
@UseGuards(OcrAuthGuard)
export class OcrController  {
  constructor(private readonly config: ConfigService) {}

  @Post('extract')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_OCR_FILE_SIZE,
        files: 1,
      },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Format non autorisé. Formats acceptés : JPEG, PNG, WEBP, TIFF et PDF.',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async extract(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    // 1. Vérifier la session Better Auth.
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.id) {
      throw new UnauthorizedException(
        'Vous devez être connecté pour utiliser l’OCR.',
      );
    }

    // 2. Vérifier que l'utilisateur est un agent actif.
    const agent = await prisma.agent.findUnique({
      where: {
        user_id: session.user.id,
      },
    });

    if (!agent?.is_active) {
      throw new ForbiddenException(
        'Votre compte agent est inexistant ou désactivé.',
      );
    }

    // 3. Vérifier le fichier.
    if (!file) {
      throw new BadRequestException(
        'Veuillez sélectionner un document.',
      );
    }

    if (file.size > MAX_OCR_FILE_SIZE) {
      throw new PayloadTooLargeException(
        'Le fichier dépasse la limite de 15 Mo.',
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format de fichier non autorisé.',
      );
    }

    // 4. Lire l'adresse du service OCR interne.
    const ocrUrl = this.config.get<string>('OCR_API_URL');

    if (!ocrUrl) {
      throw new BadGatewayException(
        'Le service OCR n’est pas configuré.',
      );
    }

    // 5. Préparer le fichier pour FastAPI.
    const formData = new FormData();

    formData.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype,
      }),
      file.originalname,
    );

    // 6. Transmettre le document au conteneur OCR.
    let response: Response;

    try {
      response = await fetch(
        `${ocrUrl.replace(/\/$/, '')}/extract`,
        {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(180_000),
        },
      );
    } catch {
      throw new BadGatewayException(
        'Le service OCR est indisponible ou le délai de traitement a été dépassé.',
      );
    }

    // 7. Lire la réponse Python.
    let result: string;

    try {
      result = await response.text();
    } catch {
      throw new BadGatewayException(
        'Impossible de lire la réponse du service OCR.',
      );
    }

    // 8. Gérer les erreurs du service OCR.
    if (!response.ok) {
      let detail = 'Une erreur est survenue pendant l’analyse OCR.';

      try {
        const errorBody: unknown = JSON.parse(result);

        if (
          typeof errorBody === 'object' &&
          errorBody !== null
        ) {
          const errorDetail = Reflect.get(errorBody, 'detail');

          if (typeof errorDetail === 'string') {
            detail = errorDetail;
          }
        }
      } catch {
        // Ne pas exposer les détails internes du service.
      }

      throw new HttpException(
        {
          message: 'L’analyse OCR a échoué.',
          detail,
        },
        response.status,
      );
    }

    // 9. Retourner le JSON OCR au frontend.
    try {
      return JSON.parse(result) as unknown;
    } catch {
      throw new BadGatewayException(
        'Le service OCR a retourné une réponse invalide.',
      );
    }
  }
}
