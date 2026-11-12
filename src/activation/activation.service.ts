import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';

import { prisma } from '../lib/prisma';
import { auth } from '../lib/auth';
import { MailService } from '../mail/mail.service';

import { RequestActivationDto } from './dto/request-activation.dto';
import { VerifyActivationDto } from './dto/verify-activation.dto';
import { CompleteActivationDto } from './dto/complete-activation.dto';

@Injectable()
export class ActivationService {
  constructor(private readonly mailService: MailService) {}

  private hashOtp(otp: string): string {
    const secret = process.env.OTP_HASH_SECRET;

    if (!secret) {
      throw new InternalServerErrorException(
        'OTP_HASH_SECRET is not configured.',
      );
    }

    return createHmac('sha256', secret).update(otp).digest('hex');
  }

  private compareOtp(otp: string, hash: string): boolean {
    const calculated = Buffer.from(this.hashOtp(otp), 'hex');
    const stored = Buffer.from(hash, 'hex');

    return (
      calculated.length === stored.length && timingSafeEqual(calculated, stored)
    );
  }

  // =====================================================
  // 1. DEMANDER UN CODE OTP
  // =====================================================

  async requestActivation(dto: RequestActivationDto) {
    const email = dto.email.trim().toLowerCase();

    // Rechercher le dossier et le citoyen
    const enrolment = await prisma.enrolment.findUnique({
      where: {
        application_id: dto.application_id,
      },
      include: {
        citizen: {
          include: {
            person: {
              include: {
                contact_method: {
                  where: {
                    type: 'EMAIL',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrolment) {
      throw new NotFoundException('Dossier introuvable.');
    }

    const citizen = enrolment.citizen;

    if (citizen.user_id) {
      throw new ConflictException('Ce citoyen possède déjà un compte.');
    }

    // L'email doit être enregistré dans les contacts du citoyen
    const contact = citizen.person.contact_method.find(
      (item) => item.value.trim().toLowerCase() === email,
    );

    if (!contact) {
      throw new BadRequestException('Adresse email non associée à ce dossier.');
    }

    // Limiter les demandes : une par minute
    const oneMinuteAgo = new Date(Date.now() - 60_000);

    const recentRequest = await prisma.citizen_activation.findFirst({
      where: {
        citizen_id: citizen.id,
        created_at: {
          gte: oneMinuteAgo,
        },
      },
    });

    if (recentRequest) {
      throw new BadRequestException(
        'Veuillez attendre une minute avant de demander un nouveau code.',
      );
    }

    // Invalider les anciennes demandes non consommées
    await prisma.citizen_activation.deleteMany({
      where: {
        citizen_id: citizen.id,
        consumed_at: null,
      },
    });

    // Générer un OTP de 6 chiffres
    const otp = randomInt(100000, 1000000).toString();

    const otpHash = this.hashOtp(otp);

    // Enregistrer uniquement le hash
    const activation = await prisma.citizen_activation.create({
      data: {
        citizen_id: citizen.id,
        email,
        otp_hash: otpHash,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    try {
      await this.mailService.sendOtp(email, otp);
    } catch (error) {
      // Si l'email ne part pas, supprimer la demande
      await prisma.citizen_activation.delete({
        where: {
          id: activation.id,
        },
      });

      throw error;
    }

    return {
      message: 'Un code de vérification a été envoyé par email.',
      expires_in: 300,
    };
  }

  // =====================================================
  // 2. VERIFIER LE CODE OTP
  // =====================================================

  async verifyActivation(dto: VerifyActivationDto) {
    const email = dto.email.trim().toLowerCase();

    const enrolment = await prisma.enrolment.findUnique({
      where: {
        application_id: dto.application_id,
      },
      select: {
        citizen_id: true,
      },
    });

    if (!enrolment) {
      throw new NotFoundException('Dossier introuvable.');
    }

    const activation = await prisma.citizen_activation.findFirst({
      where: {
        citizen_id: enrolment.citizen_id,
        email,
        consumed_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!activation) {
      throw new BadRequestException('Aucune demande d activation valide.');
    }

    if (activation.consumed_at) {
      throw new BadRequestException('Code déjà utilisé.');
    }

    if (activation.verified_at) {
      return {
        message: 'Adresse email déjà vérifiée.',
        verified: true,
      };
    }

    if (activation.expires_at.getTime() < Date.now()) {
      throw new BadRequestException('Code OTP expiré.');
    }

    if (activation.attempts >= 5) {
      throw new BadRequestException('Nombre maximum de tentatives atteint.');
    }

    if (!this.compareOtp(dto.otp, activation.otp_hash)) {
      await prisma.citizen_activation.update({
        where: {
          id: activation.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException('Code OTP incorrect.');
    }

    await prisma.citizen_activation.update({
      where: {
        id: activation.id,
      },
      data: {
        verified_at: new Date(),
      },
    });

    return {
      message: 'Adresse email vérifiée avec succès.',
      verified: true,
    };
  }

  // =====================================================
  // 3. FINALISER L'ACTIVATION ET CREER LE COMPTE
  // =====================================================

  async completeActivation(dto: CompleteActivationDto) {
    const email = dto.email.trim().toLowerCase();

    const enrolment = await prisma.enrolment.findUnique({
      where: {
        application_id: dto.application_id,
      },
      include: {
        citizen: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!enrolment) {
      throw new NotFoundException('Dossier introuvable.');
    }

    const citizen = enrolment.citizen;

    if (citizen.user_id) {
      throw new ConflictException('Ce citoyen possède déjà un compte.');
    }

    const activation = await prisma.citizen_activation.findFirst({
      where: {
        citizen_id: citizen.id,
        email,
        consumed_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!activation || !activation.verified_at) {
      throw new BadRequestException(
        'Vous devez vérifier votre adresse email avant de continuer.',
      );
    }

    // Le compte doit être créé rapidement après la vérification
    if (Date.now() - activation.verified_at.getTime() > 10 * 60 * 1000) {
      throw new BadRequestException(
        'La vérification a expiré. Veuillez recommencer.',
      );
    }

    let userId: string;

    try {
      // Création du compte Better Auth
      const result = await auth.api.signUpEmail({
        body: {
          name: [citizen.person.first_name, citizen.person.last_name]
            .filter(Boolean)
            .join(' '),
          email,
          password: dto.password,
        },
      });

      if (!result.user?.id) {
        throw new Error('User creation failed.');
      }

      userId = result.user.id;

      // L'OTP métier a déjà vérifié l'adresse email
      await prisma.$transaction(async (tx) => {
        const linked = await tx.citizen.updateMany({
          where: {
            id: citizen.id,
            user_id: null,
          },
          data: {
            user_id: userId,
          },
        });

        if (linked.count !== 1) {
          throw new ConflictException('Ce citoyen possède déjà un compte.');
        }

        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            emailVerified: true,
          },
        });

        const consumed = await tx.citizen_activation.updateMany({
          where: {
            id: activation.id,
            verified_at: {
              not: null,
            },
            consumed_at: null,
          },
          data: {
            consumed_at: new Date(),
          },
        });

        if (consumed.count !== 1) {
          throw new ConflictException(
            'Cette demande d activation a déjà été utilisée.',
          );
        }
      });

      return {
        message: 'Compte citoyen activé avec succès.',
        data: {
          user_id: userId,
          citizen_id: citizen.id,
          email,
        },
      };
    } catch (error) {
      // Si le compte a été créé mais que le rattachement échoue,
      // supprimer le compte pour éviter un compte orphelin.
      if (userId!) {
        await prisma.user
          .delete({
            where: {
              id: userId,
            },
          })
          .catch((cleanupError) => {
            console.error('Account cleanup failed:', cleanupError);
          });
      }

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('[ActivationService.completeActivation]', error);

      throw new ConflictException(
        'Impossible de finaliser l activation. Vérifiez que cet email ne possède pas déjà un compte.',
      );
    }
  }
}
