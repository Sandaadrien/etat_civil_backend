import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../lib/prisma';

@Injectable()
export class CitizenService {
  /**
   * Récupérer le profil du citoyen connecté
   * GET /citizen/me
   */
  async getMe(userId: string) {
    const citizen = await prisma.citizen.findUnique({
      where: {
        user_id: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            createdAt: true,
          },
        },
        person: true,
        enrolment: {
          include: {
            document: {
              include: {
                document_type: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        },
      },
    });

    if (!citizen) {
      throw new NotFoundException('Profil citoyen introuvable.');
    }

    // Récupérer tous les documents associés
    const documents = citizen.enrolment.flatMap(
      (enrolment) => enrolment.document,
    );

    // Regrouper les documents par type
    const groupedDocuments = Object.values(
      documents.reduce(
        (acc, document) => {
          const type = document.document_type;

          if (!acc[type.id]) {
            acc[type.id] = {
              id: type.id,
              name: type.name,
              description: type.description,
              count: 0,
            };
          }

          acc[type.id].count++;

          return acc;
        },
        {} as Record<
          string,
          {
            id: string;
            name: string;
            description: string | null;
            count: number;
          }
        >,
      ),
    );

    return {
      message: 'Informations du citoyen récupérées.',
      data: {
        user: citizen.user,

        citizen: {
          id: citizen.id,
          national_unique_id: citizen.national_unique_id,

          person: {
            first_name: citizen.person.first_name,
            last_name: citizen.person.last_name,
            date_of_birth: citizen.person.date_of_birth,
            birth_place: citizen.person.birth_place,
            sex: citizen.person.sex,
            date_of_death: citizen.person.date_of_death,
          },
        },

        documents: {
          total: documents.length,
          available_types: groupedDocuments,
        },
      },
    };
  }

  /**
   * Lister les documents du citoyen connecté
   * GET /citizen/documents
   */
  async getDocuments(userId: string) {
    const citizen = await prisma.citizen.findUnique({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!citizen) {
      throw new NotFoundException('Profil citoyen introuvable.');
    }

    const enrolments = await prisma.enrolment.findMany({
      where: {
        citizen_id: citizen.id,
      },
      include: {
        document: {
          include: {
            document_type: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const documents = enrolments.flatMap((enrolment) =>
      enrolment.document.map((document) => ({
        id: document.id,

        type: {
          id: document.document_type.id,
          name: document.document_type.name,
          description: document.document_type.description,
          evidence_strength: document.document_type.evidence_strength,
        },

        enrolment: {
          id: enrolment.id,
          type: enrolment.enrolment_type,
          sync_status: enrolment.sync_status,
          created_at: enrolment.created_at,
        },

        created_at: document.created_at,
      })),
    );

    return {
      message: 'Documents récupérés avec succès.',
      data: {
        total: documents.length,
        documents,
      },
    };
  }

  /**
   * Consulter un document particulier
   * GET /citizen/documents/:documentId
   */
  async getDocumentDetails(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,

        enrolment: {
          citizen: {
            user_id: userId,
          },
        },
      },
      include: {
        document_type: true,
        enrolment: {
          select: {
            id: true,
            enrolment_type: true,
            sync_status: true,
            created_at: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }

    return {
      message: 'Détails du document récupérés.',
      data: {
        id: document.id,

        type: {
          id: document.document_type.id,
          name: document.document_type.name,
          description: document.document_type.description,
          evidence_strength: document.document_type.evidence_strength,
          requires_mrz: document.document_type.requires_mrz,
          supports_ocr: document.document_type.supports_ocr,
          requires_original: document.document_type.requires_original,
        },

        enrolment: document.enrolment,

        created_at: document.created_at,
        updated_at: document.updated_at,
      },
    };
  }
}
