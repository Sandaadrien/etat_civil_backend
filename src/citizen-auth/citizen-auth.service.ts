import { Injectable, UnauthorizedException } from '@nestjs/common';

import { prisma } from '../lib/prisma';
import { auth } from '../lib/auth';

@Injectable()
export class CitizenAuthService {
  async login(email: string, password: string, headers: Headers) {
    // 1. Rechercher le compte citoyen
    const citizen = await prisma.citizen.findFirst({
      where: {
        user: {
          email: email.toLowerCase().trim(),
        },
      },
      include: {
        user: true,
        person: true,
      },
    });

    // 2. Vérifier l'existence du citoyen
    if (!citizen || !citizen.user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    // 3. Vérifier les identifiants avec Better Auth
    try {
      const result = await auth.api.signInEmail({
        body: {
          email: citizen.user.email,
          password,
          rememberMe: true,
        },
        headers,
      });

      // 4. Récupérer les informations de la session
      const session = await prisma.session.findUnique({
        where: {
          token: result.token,
        },
        select: {
          id: true,
          token: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      if (!session) {
        throw new UnauthorizedException('Impossible de récupérer la session.');
      }

      // 5. Retourner les informations de connexion
      return {
        message: 'Connexion citoyen réussie.',

        data: {
          token: session.token,
          expires_at: session.expiresAt,

          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            emailVerified: result.user.emailVerified,
            image: result.user.image,
          },

          citizen: {
            id: citizen.id,
            national_unique_id: citizen.national_unique_id,

            person: {
              first_name: citizen.person.first_name,
              last_name: citizen.person.last_name,
              date_of_birth: citizen.person.date_of_birth,
              birth_place: citizen.person.birth_place,
              sex: citizen.person.sex,
            },
          },
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }
  }
}
