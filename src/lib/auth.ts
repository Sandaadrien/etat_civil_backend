import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';
import { jwt, openAPI, bearer } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import {
  oauthProvider,
  oauthDeviceAuthorization,
} from '@better-auth/oauth-provider';

import { prisma } from './prisma';

const authOptions = {
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: ['http://localhost:5173', 'http://192.168.11.243:5173'],

  advanced: {
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
    },
  },

  disabledPaths: ['/token'],

  plugins: [
    openAPI(),
    bearer(),

    jwt({
      disableSettingJwtHeader: true,
    }),

    oauthProvider({
      loginPage: '/sign-in',
      consentPage: '/consent',

      scopes: ['openid', 'profile', 'email', 'offline_access'],

      accessTokenExpiresIn: 900,
      idTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 604800,
      codeExpiresIn: 300,

      // À adapter à tes ressources API.
      resources: ['https://localhost:3000'],
    }),

    oauthDeviceAuthorization({
      verificationUri: '/device',
      expiresIn: '10m',
      interval: '5s',
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);
