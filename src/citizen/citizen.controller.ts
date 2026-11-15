import { Controller, Get, Param } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { CitizenService } from './citizen.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('citizen')
@AllowAnonymous()
export class CitizenController {
  constructor(private readonly citizenService: CitizenService) {}

  /**
   * GET /citizen/me
   */
  @Get('me')
  async getMe(@Session() session: UserSession) {
    return this.citizenService.getMe(session.user.id);
  }

  /**
   * GET /citizen/documents
   */
  @Get('documents')
  async getDocuments(@Session() session: UserSession) {
    return this.citizenService.getDocuments(session.user.id);
  }

  /**
   * GET /citizen/documents/:documentId
   */
  @Get('documents/:documentId')
  async getDocumentDetails(
    @Session() session: UserSession,
    @Param('documentId') documentId: string,
  ) {
    return this.citizenService.getDocumentDetails(session.user.id, documentId);
  }
  /**
   * GET /citizen/stats
   */
  @Get('stats')
  async getStats(@Session() session: UserSession) {
    return this.citizenService.getStats(session.user.id);
  }
}
