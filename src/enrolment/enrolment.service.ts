import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { prisma } from '../lib/prisma';
import { Prisma } from 'generated/prisma/client';
import { enrolment_type, sync_status } from 'generated/prisma/enums';

import { CreateEnrolmentDto } from './dto/create-enrolment.dto';

@Injectable()
export class EnrolmentService {
  async create(dto: CreateEnrolmentDto, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Vérifier l'agent connecté
      const agent = await tx.agent.findUnique({
        where: {
          user_id: userId,
        },
      });

      if (!agent || !agent.is_active) {
        throw new NotFoundException('Agent not found or inactive');
      }

      // 2. Vérifier le pays de naissance
      const country = await tx.country.findUnique({
        where: {
          id: dto.person.country_of_birth_id,
        },
        select: {
          id: true,
        },
      });

      if (!country) {
        throw new NotFoundException('Country of birth not found');
      }

      // 3. Vérifier le fokontany
      const fokontany = await tx.fokontany.findUnique({
        where: {
          id: dto.address.fokontany_id,
        },
        select: {
          id: true,
        },
      });

      if (!fokontany) {
        throw new NotFoundException('Fokontany not found');
      }

      // 4. Vérifier les types de documents
      if (!dto.documents?.length) {
        throw new BadRequestException('At least one document is required');
      }

      const documentTypeIds = [
        ...new Set(dto.documents.map((document) => document.document_type_id)),
      ];

      const documentTypes = await tx.document_type.findMany({
        where: {
          id: {
            in: documentTypeIds,
          },
        },
        select: {
          id: true,
        },
      });

      const existingTypeIds = new Set(
        documentTypes.map((documentType) => documentType.id),
      );

      for (const documentTypeId of documentTypeIds) {
        if (!existingTypeIds.has(documentTypeId)) {
          throw new NotFoundException(
            `Document type ${documentTypeId} not found`,
          );
        }
      }

      // 5. Vérifier les fichiers et les côtés des documents
      const storageKeys: string[] = [];

      for (const document of dto.documents) {
        if (!document.files?.length) {
          throw new BadRequestException(
            'Each document must have at least one file',
          );
        }

        const sides = document.files.map((file) => file.side);

        if (new Set(sides).size !== sides.length) {
          throw new BadRequestException(
            'Duplicate file side for the same document',
          );
        }

        for (const file of document.files) {
          if (file.file_size <= 0) {
            throw new BadRequestException(
              'File size must be greater than zero',
            );
          }

          storageKeys.push(file.storage_key);
        }
      }

      if (new Set(storageKeys).size !== storageKeys.length) {
        throw new BadRequestException('Duplicate storage_key in the request');
      }

      // 6. Créer la personne
      const person = await tx.person.create({
        data: {
          first_name: dto.person.first_name ?? null,
          last_name: dto.person.last_name,
          date_of_birth: dto.person.date_of_birth
            ? new Date(dto.person.date_of_birth)
            : null,
          birth_place: dto.person.birth_place ?? null,
          country_of_birth_id: dto.person.country_of_birth_id,
          sex: dto.person.sex,
        },
      });

      // 7. Créer le citoyen
      const citizen = await tx.citizen.create({
        data: {
          person_id: person.id,
          national_unique_id: `NUI-${randomUUID()}`,
        },
      });

      // 8. Créer l'enrôlement
      const enrolment = await tx.enrolment.create({
        data: {
          agent_id: agent.id,
          citizen_id: citizen.id,
          application_id: `APP-${randomUUID()}`,
          enrolment_type: dto.enrolment_type ?? enrolment_type.NEW,
          created_offline: dto.created_offline ?? false,
          sync_status: sync_status.PENDING,
        },
      });

      // 9. Créer l'adresse
      await tx.address.create({
        data: {
          person_id: person.id,
          fokontany_id: dto.address.fokontany_id,
          house_number: dto.address.house_number,
          occupancy_type: dto.address.occupancy_type,
        },
      });

      // 10. Créer les contacts
      if (dto.contacts?.length) {
        await tx.contact_method.createMany({
          data: dto.contacts.map((contact) => ({
            person_id: person.id,
            type: contact.type,
            value: contact.value,
            is_primary: contact.is_primary ?? false,
            is_verified: contact.is_verified ?? false,
          })),
        });
      }

      // 11. Créer les relations familiales
      if (dto.relationships?.length) {
        const relationshipsData: Prisma.family_relationshipCreateManyInput[] =
          [];

        for (const relationship of dto.relationships) {
          const relatedCitizenId = relationship.related_citizen_id ?? null;

          if (relatedCitizenId) {
            const relatedCitizen = await tx.citizen.findUnique({
              where: {
                id: relatedCitizenId,
              },
              select: {
                id: true,
              },
            });

            if (!relatedCitizen) {
              throw new NotFoundException(
                `Related citizen ${relatedCitizenId} not found`,
              );
            }

            if (relatedCitizenId === citizen.id) {
              throw new BadRequestException(
                'A citizen cannot be related to themselves',
              );
            }
          } else if (!relationship.related_person_name?.trim()) {
            throw new BadRequestException(
              'Provide related_citizen_id or related_person_name',
            );
          }

          relationshipsData.push({
            citizen_id: citizen.id,
            related_citizen_id: relatedCitizenId,
            related_person_name: relationship.related_person_name ?? null,
            relationship_type: relationship.relationship_type,
          });
        }

        await tx.family_relationship.createMany({
          data: relationshipsData,
        });
      }

      // 12. Créer les documents et leurs fichiers
      for (const documentDto of dto.documents) {
        const document = await tx.document.create({
          data: {
            enrolment_id: enrolment.id,
            document_type_id: documentDto.document_type_id,
          },
          select: {
            id: true,
          },
        });

        await tx.document_file.createMany({
          data: documentDto.files.map((file) => ({
            document_id: document.id,
            side: file.side,
            storage_key: file.storage_key,
            original_filename: file.original_filename ?? null,
            mime_type: file.mime_type,
            file_size: BigInt(file.file_size),
            checksum: file.checksum ?? null,
          })),
        });
      }

      // 13. Créer les biométries faciales
      if (dto.face_biometrics?.length) {
        await tx.face_biometric.createMany({
          data: dto.face_biometrics.map((biometric) => ({
            enrolment_id: enrolment.id,
            image_file_path: biometric.image_file_path,
            model_name: biometric.model_name ?? 'unknown',
            model_version: biometric.model_version ?? 'unknown',
            embedding: biometric.embedding,
            quality_score: biometric.quality_score ?? 0,
            face_detected: biometric.face_detected ?? false,
          })),
        });
      }

      // 14. Retourner le résultat
      return {
        enrolment_id: enrolment.id,
        application_id: enrolment.application_id,
        enrolment_type: enrolment.enrolment_type,
        sync_status: enrolment.sync_status,
        citizen_id: citizen.id,
        national_unique_id: citizen.national_unique_id,
        person_id: person.id,
        created_at: enrolment.created_at,
      };
    });
  }
}
