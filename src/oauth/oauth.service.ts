import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { auth } from '../lib/auth';

@Injectable()
export class OauthService {
  async getSession(headers: Headers) {
    return auth.api.getSession({ headers });
  }

  async createClient(
    headers: Headers,
    data: {
      client_name: string;
      redirect_uris: string[];
      post_logout_redirect_uris?: string[];
      application_type?: string;
      token_endpoint_auth_method?: string;
    },
  ) {
    try {
      const isNative = data.application_type === 'native';

      const client = await auth.api.adminCreateOAuthClient({
        headers,
        body: {
          client_name: data.client_name,

          redirect_uris: data.redirect_uris,

          post_logout_redirect_uris: data.post_logout_redirect_uris ?? [],

          scope: 'openid profile email',

          token_endpoint_auth_method: isNative ? 'none' : 'client_secret_basic',

          grant_types: ['authorization_code'],

          response_types: ['code'],

          require_pkce: true,

          application_type: isNative ? 'native' : 'web',

          // IMPORTANT : autoriser le logout OIDC
          enable_end_session: true,
        },
      });

      return {
        success: true,
        message: 'OAuth client created successfully',
        client,
      };
    } catch (error) {
      console.error('OAuth client creation failed:', error);

      throw new InternalServerErrorException('Unable to create OAuth client');
    }
  }
}
