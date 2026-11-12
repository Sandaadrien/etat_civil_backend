import { betterAuth } from 'better-auth';

import { prismaAdapter } from 'better-auth/adapters/prisma';

import { bearer, jwt, openAPI } from 'better-auth/plugins';

import {
  oauthProvider,
  oauthDeviceAuthorization,
} from '@better-auth/oauth-provider';

import { prisma } from './prisma';

export const auth = betterAuth({
  appName: 'Citizen Application',

  // baseURL: process.env.BETTER_AUTH_URL,
  baseURL: 'http://192.168.11.219:3000',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.11.205:5173',
  ],
  disabledPaths: ['/token'],

  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
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
          identifier: 'http://localhost:3000',
          allowedScopes: ['citizen:read'],
          accessTokenTtl: 900,
        },
      ],
    }),

    // Authentification avec code sur un autre appareil
    oauthDeviceAuthorization(),
  ],
});
