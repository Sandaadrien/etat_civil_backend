
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';

import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';

@Injectable()
export class OcrAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.id) {
      throw new UnauthorizedException(
        'Vous devez être connecté pour utiliser l’OCR.',
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { user_id: session.user.id },
    });

    if (!agent?.is_active) {
      throw new ForbiddenException(
        'Votre compte agent est inexistant ou désactivé.',
      );
    }

    return true;
  }
}
