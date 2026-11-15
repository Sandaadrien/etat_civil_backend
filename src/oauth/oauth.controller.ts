import {
  Controller,
  Post,
  Body,
  Headers,
  ForbiddenException,
} from '@nestjs/common';

import { OauthService } from './oauth.service';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('oauth')
@AllowAnonymous()
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Post('clients')
  async createClient(
    @Headers() headers: Record<string, string>,
    @Body()
    body: {
      client_name: string;
      redirect_uris: string[];
    },
  ) {
    // Vérifier que la requête possède une session Citizen.
    const requestHeaders = new globalThis.Headers();

    for (const [name, value] of Object.entries(headers)) {
      requestHeaders.set(name, value);
    }

    const session = await this.oauthService.getSession(requestHeaders);

    if (!session) {
      throw new ForbiddenException('Authentification requise');
    }

    return this.oauthService.createClient(requestHeaders, body);
  }
}
