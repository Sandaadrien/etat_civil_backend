import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { prisma } from '../lib/prisma';
import { CreateEnrolmentDto } from './dto/create-enrolment.dto';
import { EnrolmentService } from './enrolment.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    agent: { findUnique: jest.fn() },
    country: { findUnique: jest.fn() },
    fokontany: { findUnique: jest.fn() },
    document_type: { findMany: jest.fn() },
    person: { create: jest.fn() },
    citizen: { create: jest.fn(), findUnique: jest.fn() },
    enrolment: { create: jest.fn() },
    address: { create: jest.fn() },
    contact_method: { createMany: jest.fn() },
    family_relationship: { createMany: jest.fn() },
    document: { create: jest.fn() },
    document_file: { createMany: jest.fn() },
    face_biometric: { createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const prismaMock = prisma as any;

const USER_ID = 'user-1';
const AGENT_ID = 'agent-1';
const CITIZEN_ID = 'citizen-1';
const PERSON_ID = 'person-1';
const ENROLMENT_ID = 'enrolment-1';
const DOCUMENT_TYPE_ID = 'document-type-1';

function buildDto(
  overrides: Partial<CreateEnrolmentDto> = {},
): CreateEnrolmentDto {
  return {
    person: {
      first_name: 'Jean',
      last_name: 'RAKOTO',
      date_of_birth: '1995-06-15',
      birth_place: 'Antananarivo',
      country_of_birth_id: 'country-1',
      sex: 'M',
    },
    address: {
      house_number: '12B',
      fokontany_id: 'fokontany-1',
      occupancy_type: 'OWNER',
    },
    documents: [
      {
        document_type_id: DOCUMENT_TYPE_ID,
        files: [
          {
            side: 'FRONT',
            storage_key: 'documents/front.png',
            mime_type: 'image/png',
            file_size: 1024,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('EnrolmentService', () => {
  let service: EnrolmentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));

    const module: TestingModule = await Test.createTestingModule({
      providers: [EnrolmentService],
    }).compile();

    service = module.get<EnrolmentService>(EnrolmentService);
  });

  function mockHappyPath() {
    prismaMock.agent.findUnique.mockResolvedValue({
      id: AGENT_ID,
      is_active: true,
    });
    prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
    prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'fokontany-1' });
    prismaMock.document_type.findMany.mockResolvedValue([
      { id: DOCUMENT_TYPE_ID },
    ]);
    prismaMock.person.create.mockResolvedValue({ id: PERSON_ID });
    prismaMock.citizen.create.mockResolvedValue({
      id: CITIZEN_ID,
      national_unique_id: 'NUI-test',
    });
    prismaMock.enrolment.create.mockResolvedValue({
      id: ENROLMENT_ID,
      application_id: 'APP-test',
      enrolment_type: 'NEW',
      sync_status: 'PENDING',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    });
    prismaMock.address.create.mockResolvedValue({});
    prismaMock.document.create.mockResolvedValue({ id: 'document-1' });
    prismaMock.document_file.createMany.mockResolvedValue({ count: 1 });
  }

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('create - validations', () => {
    it('lance NotFoundException si l’agent est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue(null);

      await expect(service.create(buildDto(), USER_ID)).rejects.toThrow(
        new NotFoundException('Agent not found or inactive'),
      );
    });

    it('lance NotFoundException si l’agent est inactif', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: false,
      });

      await expect(service.create(buildDto(), USER_ID)).rejects.toThrow(
        new NotFoundException('Agent not found or inactive'),
      );
    });

    it('lance NotFoundException si le pays est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue(null);

      await expect(service.create(buildDto(), USER_ID)).rejects.toThrow(
        new NotFoundException('Country of birth not found'),
      );
    });

    it('lance NotFoundException si le fokontany est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
      prismaMock.fokontany.findUnique.mockResolvedValue(null);

      await expect(service.create(buildDto(), USER_ID)).rejects.toThrow(
        new NotFoundException('Fokontany not found'),
      );
    });

    it('lance BadRequestException sans document', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
      prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'fokontany-1' });

      await expect(
        service.create(buildDto({ documents: [] }), USER_ID),
      ).rejects.toThrow(
        new BadRequestException('At least one document is required'),
      );
    });

    it('lance NotFoundException si un type de document est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
      prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'fokontany-1' });
      prismaMock.document_type.findMany.mockResolvedValue([]);

      await expect(service.create(buildDto(), USER_ID)).rejects.toThrow(
        new NotFoundException(`Document type ${DOCUMENT_TYPE_ID} not found`),
      );
    });

    it('lance BadRequestException si un document n’a pas de fichier', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
      prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'fokontany-1' });
      prismaMock.document_type.findMany.mockResolvedValue([
        { id: DOCUMENT_TYPE_ID },
      ]);

      await expect(
        service.create(
          buildDto({
            documents: [{ document_type_id: DOCUMENT_TYPE_ID, files: [] }],
          }),
          USER_ID,
        ),
      ).rejects.toThrow(
        new BadRequestException('Each document must have at least one file'),
      );
    });

    it('lance BadRequestException sur des côtés de fichier dupliqués', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
      prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'fokontany-1' });
      prismaMock.document_type.findMany.mockResolvedValue([
        { id: DOCUMENT_TYPE_ID },
      ]);

      await expect(
        service.create(
          buildDto({
            documents: [
              {
                document_type_id: DOCUMENT_TYPE_ID,
                files: [
                  {
                    side: 'FRONT',
                    storage_key: 'k1',
                    mime_type: 'image/png',
                    file_size: 10,
                  },
                  {
                    side: 'FRONT',
                    storage_key: 'k2',
                    mime_type: 'image/png',
                    file_size: 10,
                  },
                ],
              },
            ],
          }),
          USER_ID,
        ),
      ).rejects.toThrow(
        new BadRequestException('Duplicate file side for the same document'),
      );
    });

    it('lance BadRequestException si la taille d’un fichier est nulle', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
      prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'fokontany-1' });
      prismaMock.document_type.findMany.mockResolvedValue([
        { id: DOCUMENT_TYPE_ID },
      ]);

      const dto = buildDto();
      dto.documents[0].files[0].file_size = 0;

      await expect(service.create(dto, USER_ID)).rejects.toThrow(
        new BadRequestException('File size must be greater than zero'),
      );
    });

    it('lance BadRequestException si un storage_key est dupliqué', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
      prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'fokontany-1' });
      prismaMock.document_type.findMany.mockResolvedValue([
        { id: DOCUMENT_TYPE_ID },
        { id: 'document-type-2' },
      ]);

      await expect(
        service.create(
          buildDto({
            documents: [
              {
                document_type_id: DOCUMENT_TYPE_ID,
                files: [
                  {
                    side: 'FRONT',
                    storage_key: 'same-key',
                    mime_type: 'image/png',
                    file_size: 10,
                  },
                ],
              },
              {
                document_type_id: 'document-type-2',
                files: [
                  {
                    side: 'BACK',
                    storage_key: 'same-key',
                    mime_type: 'image/png',
                    file_size: 10,
                  },
                ],
              },
            ],
          }),
          USER_ID,
        ),
      ).rejects.toThrow(
        new BadRequestException('Duplicate storage_key in the request'),
      );
    });
  });

  describe('create - succès', () => {
    it('crée l’enrôlement complet et retourne le résumé', async () => {
      mockHappyPath();

      const result = await service.create(buildDto(), USER_ID);

      expect(prismaMock.person.create).toHaveBeenCalled();
      expect(prismaMock.citizen.create).toHaveBeenCalled();
      expect(prismaMock.enrolment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agent_id: AGENT_ID,
            citizen_id: CITIZEN_ID,
            sync_status: 'PENDING',
          }),
        }),
      );
      expect(prismaMock.address.create).toHaveBeenCalled();
      expect(prismaMock.document.create).toHaveBeenCalled();
      expect(prismaMock.document_file.createMany).toHaveBeenCalled();
      expect(result).toEqual({
        enrolment_id: ENROLMENT_ID,
        application_id: 'APP-test',
        enrolment_type: 'NEW',
        sync_status: 'PENDING',
        citizen_id: CITIZEN_ID,
        national_unique_id: 'NUI-test',
        person_id: PERSON_ID,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('crée les contacts et biométries optionnels', async () => {
      mockHappyPath();
      prismaMock.contact_method.createMany.mockResolvedValue({ count: 1 });
      prismaMock.face_biometric.createMany.mockResolvedValue({ count: 1 });

      await service.create(
        buildDto({
          contacts: [{ type: 'PHONE', value: '+261340000000' }],
          face_biometrics: [
            {
              image_file_path: 'faces/person.jpg',
              embedding: '[0.1,0.2]',
            },
          ],
        }),
        USER_ID,
      );

      expect(prismaMock.contact_method.createMany).toHaveBeenCalled();
      expect(prismaMock.face_biometric.createMany).toHaveBeenCalled();
    });

    it('convertit file_size en BigInt', async () => {
      mockHappyPath();

      await service.create(buildDto(), USER_ID);

      const data = prismaMock.document_file.createMany.mock.calls[0][0].data;
      expect(data[0].file_size).toBe(BigInt(1024));
    });
  });

  describe('create - relations familiales', () => {
    beforeEach(() => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: AGENT_ID,
        is_active: true,
      });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
      prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'fokontany-1' });
      prismaMock.document_type.findMany.mockResolvedValue([
        { id: DOCUMENT_TYPE_ID },
      ]);
      prismaMock.person.create.mockResolvedValue({ id: PERSON_ID });
      prismaMock.citizen.create.mockResolvedValue({
        id: CITIZEN_ID,
        national_unique_id: 'NUI-test',
      });
      prismaMock.enrolment.create.mockResolvedValue({
        id: ENROLMENT_ID,
        application_id: 'APP-test',
        enrolment_type: 'NEW',
        sync_status: 'PENDING',
        created_at: new Date(),
      });
      prismaMock.address.create.mockResolvedValue({});
      prismaMock.document.create.mockResolvedValue({ id: 'document-1' });
      prismaMock.document_file.createMany.mockResolvedValue({ count: 1 });
      prismaMock.family_relationship.createMany.mockResolvedValue({ count: 1 });
    });

    it('lance NotFoundException si le citoyen lié est introuvable', async () => {
      prismaMock.citizen.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          buildDto({
            relationships: [
              {
                related_citizen_id: 'citizen-x',
                relationship_type: 'FATHER',
              },
            ],
          }),
          USER_ID,
        ),
      ).rejects.toThrow(
        new NotFoundException('Related citizen citizen-x not found'),
      );
    });

    it('lance BadRequestException si le citoyen se référence lui-même', async () => {
      prismaMock.citizen.findUnique.mockResolvedValue({ id: CITIZEN_ID });

      await expect(
        service.create(
          buildDto({
            relationships: [
              {
                related_citizen_id: CITIZEN_ID,
                relationship_type: 'FATHER',
              },
            ],
          }),
          USER_ID,
        ),
      ).rejects.toThrow(
        new BadRequestException('A citizen cannot be related to themselves'),
      );
    });

    it('lance BadRequestException sans citoyen lié ni nom', async () => {
      await expect(
        service.create(
          buildDto({
            relationships: [{ relationship_type: 'FATHER' }],
          }),
          USER_ID,
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Provide related_citizen_id or related_person_name',
        ),
      );
    });

    it('crée les relations avec un citoyen existant', async () => {
      prismaMock.citizen.findUnique.mockResolvedValue({ id: 'citizen-x' });

      await service.create(
        buildDto({
          relationships: [
            { related_citizen_id: 'citizen-x', relationship_type: 'FATHER' },
          ],
        }),
        USER_ID,
      );

      expect(prismaMock.family_relationship.createMany).toHaveBeenCalledWith({
        data: [
          {
            citizen_id: CITIZEN_ID,
            related_citizen_id: 'citizen-x',
            related_person_name: null,
            relationship_type: 'FATHER',
          },
        ],
      });
    });
  });
});
