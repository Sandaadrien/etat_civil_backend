import { betterAuth } from 'better-auth';

import { prismaAdapter } from 'better-auth/adapters/prisma';

import { bearer, jwt, openAPI } from 'better-auth/plugins';

import {
  oauthProvider,
  oauthDeviceAuthorization,
} from '@better-auth/oauth-provider';
import { prisma } from './prisma';

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const OAUTH_RESOURCE_URL = process.env.OAUTH_RESOURCE_URL;

if (!BETTER_AUTH_URL || !OAUTH_RESOURCE_URL) {
  throw new Error('BETTER_AUTH_URL et OAUTH_RESOURCE_URL sont obligatoires');
}
export const auth = betterAuth({
  appName: 'Citizen Application',

  // baseURL: process.env.BETTER_AUTH_URL,
  baseURL: BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
  },

  // trustedOrigins: [
  //   'http://localhost:5173',
  //   'http://127.0.0.1:5173',
  //   'http://192.168.11.205:5173',
  //   'http://localhost:3000',
  // ],

  disabledPaths: ['/token'],

  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    disableOriginCheck: true,
  },

  plugins: [
    openAPI(),

    bearer(),

    jwt({
      disableSettingJwtHeader: true,
    }),

    // Notre serveur OAuth / OpenID Connect
    oauthProvider({
      loginPage: '/sign-in',
      consentPage: '/consent',
      scopes: ['openid', 'profile', 'email', 'offline_access', 'citizen:read'],

      accessTokenExpiresIn: 900,
      idTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 604800,
      codeExpiresIn: 300,

      resources: [
        {
          // identifier: 'http://localhost:3000',
          identifier: OAUTH_RESOURCE_URL,
          allowedScopes: ['citizen:read'],
          accessTokenTtl: 900,
        },
      ],
    }),

    // Authentification avec code sur un autre appareil
    oauthDeviceAuthorization(),
  ],
});
