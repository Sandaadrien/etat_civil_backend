import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { auth } from '../lib/auth';

@Injectable()
export class OauthService {
  async createClient(
    headers: Headers,
    data: {
      client_name: string;
      redirect_uris: string[];
      post_logout_redirect_uris?: string[];
      scopes: string[];
    },
  ) {
    try {
      const client = await auth.api.adminCreateOAuthClient({
        headers,
        body: {
          client_name: data.client_name,
          redirect_uris: data.redirect_uris,
          post_logout_redirect_uris: data.post_logout_redirect_uris ?? [],
          scope: data.scopes.join(' '),
        },
      });

      return {
        message: 'OAuth client created successfully',
        client,
      };
    } catch (error) {
      console.error('OAuth client creation failed:', error);

      throw new InternalServerErrorException('Unable to create OAuth client');
    }
  }
}
