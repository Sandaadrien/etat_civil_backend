import {
  Controller,
  Post,
  Body,
  Headers as HeadersDecorator,
} from '@nestjs/common';

import { OauthService } from './oauth.service';

@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Post('clients')
  async createClient(
    @HeadersDecorator() headers: Record<string, string>,
    @Body()
    body: {
      client_name: string;
      redirect_uris: string[];
      post_logout_redirect_uris?: string[];
      scopes: string[];
    },
  ) {
    const requestHeaders = new globalThis.Headers();
    for (const [name, value] of Object.entries(headers)) {
      requestHeaders.set(name, value);
    }
    return this.oauthService.createClient(requestHeaders, body);
  }
}
