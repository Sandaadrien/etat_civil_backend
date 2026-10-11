import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { auth } from '../lib/auth';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  async create(dto: CreateAgentDto) {
    // 1. Vérifier le rôle et le centre avant de créer le compte.
    const [role, centre, country] = await Promise.all([
      prisma.application_role.findUnique({
        where: { id: dto.role_id },
      }),
      prisma.centre.findUnique({
        where: { id: dto.centre_id },
      }),
      prisma.country.findUnique({
        where: { id: dto.country_of_birth_id },
      }),
    ]);

    if (!role) {
      throw new NotFoundException('Rôle introuvable.');
    }

    if (!centre) {
      throw new NotFoundException('Centre introuvable.');
    }

    if (!country) {
      throw new NotFoundException('Pays de naissance introuvable.');
    }

    // 2. Créer le compte via Better Auth.
    // Ne pas créer User/Account manuellement :
    // Better Auth gère également le mot de passe.
    let userId: string;

    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: dto.name,
          email: dto.email,
          password: dto.password,
        },
      });

      if (!result.user?.id) {
        throw new Error('Better Auth n’a pas retourné le compte créé.');
      }

      userId = result.user.id;
    } catch (error) {
      // Une erreur d'unicité email peut venir de PostgreSQL
      // ou être renvoyée par Better Auth.
      const existingUser = await prisma.user
        .findUnique({
          where: { email: dto.email },
          select: { id: true },
        })
        .catch(() => null);
      console.error(error);

      if (existingUser) {
        throw new ConflictException('Cette adresse email est déjà utilisée.');
      }

      throw new InternalServerErrorException(
        'Impossible de créer le compte utilisateur.',
      );
    }

    try {
      // 3. Créer le profil métier dans une transaction.
      const created = await prisma.$transaction(async (tx) => {
        const person = await tx.person.create({
          data: {
            first_name: dto.first_name,
            last_name: dto.last_name,
            birth_place: dto.birth_place,
            date_of_birth: dto.date_of_birth
              ? new Date(`${dto.date_of_birth}T00:00:00.000Z`)
              : undefined,
            country_of_birth_id: dto.country_of_birth_id,
            sex: dto.sex ?? 'M',
          },
        });

        const agent = await tx.agent.create({
          data: {
            user_id: userId,
            person_id: person.id,
            role_id: dto.role_id,
            centre_id: dto.centre_id,
          },
          include: {
            person: true,
            application_role: true,
            centre: true,
          },
        });

        return agent;
      });

      // Ne jamais renvoyer le mot de passe au client.
      return {
        message: 'Agent créé avec succès.',
        data: {
          id: created.id,
          user_id: created.user_id,
          person: created.person,
          role: created.application_role,
          centre: created.centre,
        },
      };
    } catch (error) {
      // 4. La transaction a échoué : supprimer le compte créé
      // pour éviter de conserver un utilisateur sans profil agent.
      try {
        await prisma.user.delete({
          where: { id: userId },
        });
      } catch {
        // En production, journaliser cette erreur et prévoir
        // un mécanisme de réconciliation des comptes orphelins.
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Une donnée unique est déjà utilisée.');
      }

      throw new InternalServerErrorException(
        'Impossible de créer le profil agent.',
      );
    }
  }

  async findAll(page = 1, limit = 10, search?: string) {
    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException(
        'page doit être positif et limit compris entre 1 et 100.',
      );
    }

    const where: Prisma.agentWhereInput = search?.trim()
      ? {
          OR: [
            {
              person: {
                is: {
                  first_name: {
                    contains: search.trim(),
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              person: {
                is: {
                  last_name: {
                    contains: search.trim(),
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              user: {
                is: {
                  email: {
                    contains: search.trim(),
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              centre: {
                is: {
                  name: {
                    contains: search.trim(),
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        }
      : {};

    const [total, agents] = await prisma.$transaction([
      prisma.agent.count({ where }),
      prisma.agent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          person: true,
          centre: true,
          application_role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data: agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        person: true,
        centre: true,
        application_role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent introuvable.');
    }

    return agent;
  }

  async update(id: string, dto: UpdateAgentDto) {
    const existing = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, person_id: true },
    });

    if (!existing) {
      throw new NotFoundException('Agent introuvable.');
    }

    if (dto.role_id) {
      const role = await prisma.application_role.findUnique({
        where: { id: dto.role_id },
      });

      if (!role) {
        throw new NotFoundException('Rôle introuvable.');
      }
    }

    if (dto.centre_id) {
      const centre = await prisma.centre.findUnique({
        where: { id: dto.centre_id },
      });

      if (!centre) {
        throw new NotFoundException('Centre introuvable.');
      }
    }

    if (dto.country_of_birth_id) {
      const country = await prisma.country.findUnique({
        where: { id: dto.country_of_birth_id },
      });

      if (!country) {
        throw new NotFoundException('Pays introuvable.');
      }
    }

    const {
      first_name,
      last_name,
      date_of_birth,
      birth_place,
      country_of_birth_id,
      sex,
      role_id,
      centre_id,
    } = dto;

    return prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: existing.person_id },
        data: {
          ...(first_name !== undefined && { first_name }),
          ...(last_name !== undefined && { last_name }),
          ...(birth_place !== undefined && { birth_place }),
          ...(country_of_birth_id !== undefined && {
            country_of_birth_id,
          }),
          ...(sex !== undefined && { sex }),
          ...(date_of_birth !== undefined && {
            date_of_birth: date_of_birth
              ? new Date(`${date_of_birth}T00:00:00.000Z`)
              : null,
          }),
        },
      });

      return tx.agent.update({
        where: { id },
        data: {
          ...(role_id !== undefined && { role_id }),
          ...(centre_id !== undefined && { centre_id }),
        },
        select: {
          id: true,
          is_active: true,
          person: true,
          centre: true,
          application_role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  }

  async updateStatus(id: string, isActive: boolean) {
    const existing = await prisma.agent.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Agent introuvable.');
    }

    return prisma.agent.update({
      where: { id },
      data: { is_active: isActive },
      select: {
        id: true,
        is_active: true,
        updated_at: true,
      },
    });
  }
}
