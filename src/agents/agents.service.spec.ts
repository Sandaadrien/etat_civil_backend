import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client';
import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';

jest.mock('../lib/prisma', () => ({
  prisma: {
    application_role: { findUnique: jest.fn() },
    centre: { findUnique: jest.fn() },
    country: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), delete: jest.fn() },
    agent: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    person: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../lib/auth', () => ({
  auth: { api: { signUpEmail: jest.fn() } },
}));

const prismaMock = prisma as any;
const authMock = auth as any;

const validDto: CreateAgentDto = {
  name: 'Admin Test',
  email: 'admin@example.com',
  password: 'supersecret',
  last_name: 'RAKOTO',
  first_name: 'Jean',
  birth_place: 'Antananarivo',
  date_of_birth: '1990-01-01',
  country_of_birth_id: 'country-1',
  sex: 'M',
  role_id: 'role-1',
  centre_id: 'centre-1',
};

describe('AgentsService', () => {
  let service: AgentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentsService],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    function mockReferencesFound() {
      prismaMock.application_role.findUnique.mockResolvedValue({
        id: 'role-1',
      });
      prismaMock.centre.findUnique.mockResolvedValue({ id: 'centre-1' });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });
    }

    it('lance NotFoundException si le rôle est introuvable', async () => {
      prismaMock.application_role.findUnique.mockResolvedValue(null);
      prismaMock.centre.findUnique.mockResolvedValue({ id: 'centre-1' });
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });

      await expect(service.create(validDto)).rejects.toThrow(
        new NotFoundException('Rôle introuvable.'),
      );
    });

    it('lance NotFoundException si le centre est introuvable', async () => {
      prismaMock.application_role.findUnique.mockResolvedValue({
        id: 'role-1',
      });
      prismaMock.centre.findUnique.mockResolvedValue(null);
      prismaMock.country.findUnique.mockResolvedValue({ id: 'country-1' });

      await expect(service.create(validDto)).rejects.toThrow(
        new NotFoundException('Centre introuvable.'),
      );
    });

    it('lance NotFoundException si le pays est introuvable', async () => {
      prismaMock.application_role.findUnique.mockResolvedValue({
        id: 'role-1',
      });
      prismaMock.centre.findUnique.mockResolvedValue({ id: 'centre-1' });
      prismaMock.country.findUnique.mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toThrow(
        new NotFoundException('Pays de naissance introuvable.'),
      );
    });

    it('crée un agent avec succès sans exposer le mot de passe', async () => {
      mockReferencesFound();
      authMock.api.signUpEmail.mockResolvedValue({ user: { id: 'user-1' } });
      prismaMock.person.create.mockResolvedValue({ id: 'person-1' });
      prismaMock.agent.create.mockResolvedValue({
        id: 'agent-1',
        user_id: 'user-1',
        person: { id: 'person-1' },
        application_role: { id: 'role-1', name: 'ADMIN' },
        centre: { id: 'centre-1' },
      });

      const result = await service.create(validDto);

      expect(authMock.api.signUpEmail).toHaveBeenCalledWith({
        body: {
          name: validDto.name,
          email: validDto.email,
          password: validDto.password,
        },
      });
      expect(prismaMock.person.create).toHaveBeenCalled();
      expect(prismaMock.agent.create).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Agent créé avec succès.',
        data: {
          id: 'agent-1',
          user_id: 'user-1',
          person: { id: 'person-1' },
          role: { id: 'role-1', name: 'ADMIN' },
          centre: { id: 'centre-1' },
        },
      });
      expect(JSON.stringify(result)).not.toContain('password');
    });

    it('lance ConflictException si l’email existe déjà (signUp échoue)', async () => {
      mockReferencesFound();
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      authMock.api.signUpEmail.mockRejectedValue(new Error('email taken'));
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(service.create(validDto)).rejects.toThrow(
        new ConflictException('Cette adresse email est déjà utilisée.'),
      );
    });

    it('lance InternalServerErrorException si signUp échoue sans utilisateur existant', async () => {
      mockReferencesFound();
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      authMock.api.signUpEmail.mockRejectedValue(new Error('boom'));
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toThrow(
        new InternalServerErrorException(
          'Impossible de créer le compte utilisateur.',
        ),
      );
    });

    it('supprime le compte et lance ConflictException sur violation d’unicité (P2002)', async () => {
      mockReferencesFound();
      authMock.api.signUpEmail.mockResolvedValue({ user: { id: 'user-1' } });
      prismaMock.user.delete.mockResolvedValue({});
      prismaMock.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.create(validDto)).rejects.toThrow(
        new ConflictException('Une donnée unique est déjà utilisée.'),
      );
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('supprime le compte et lance InternalServerErrorException sur erreur générique', async () => {
      mockReferencesFound();
      authMock.api.signUpEmail.mockResolvedValue({ user: { id: 'user-1' } });
      prismaMock.user.delete.mockResolvedValue({});
      prismaMock.$transaction.mockRejectedValue(new Error('db down'));

      await expect(service.create(validDto)).rejects.toThrow(
        new InternalServerErrorException(
          'Impossible de créer le profil agent.',
        ),
      );
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('findAll', () => {
    it('lance BadRequestException pour une pagination invalide', async () => {
      await expect(service.findAll(0, 10)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(1, 0)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(1, 101)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('retourne les agents avec la pagination', async () => {
      prismaMock.agent.count.mockResolvedValue(2);
      prismaMock.agent.findMany.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: [{ id: 'a1' }, { id: 'a2' }],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
    });

    it('applique un filtre de recherche', async () => {
      prismaMock.agent.count.mockResolvedValue(0);
      prismaMock.agent.findMany.mockResolvedValue([]);

      await service.findAll(1, 10, '  jean  ');

      const findManyArgs = prismaMock.agent.findMany.mock.calls[0][0];
      expect(findManyArgs.where.OR).toBeDefined();
      expect(findManyArgs.where.OR[0].person.is.first_name.contains).toBe(
        'jean',
      );
    });
  });

  describe('findOne', () => {
    it('retourne l’agent trouvé', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({ id: 'a1' });

      await expect(service.findOne('a1')).resolves.toEqual({ id: 'a1' });
    });

    it('lance NotFoundException si l’agent est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue(null);

      await expect(service.findOne('x')).rejects.toThrow(
        new NotFoundException('Agent introuvable.'),
      );
    });
  });

  describe('update', () => {
    it('lance NotFoundException si l’agent est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue(null);

      await expect(service.update('x', {})).rejects.toThrow(
        new NotFoundException('Agent introuvable.'),
      );
    });

    it('lance NotFoundException si le nouveau rôle est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: 'a1',
        person_id: 'p1',
      });
      prismaMock.application_role.findUnique.mockResolvedValue(null);

      await expect(service.update('a1', { role_id: 'r-x' })).rejects.toThrow(
        new NotFoundException('Rôle introuvable.'),
      );
    });

    it('lance NotFoundException si le nouveau centre est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: 'a1',
        person_id: 'p1',
      });
      prismaMock.centre.findUnique.mockResolvedValue(null);

      await expect(service.update('a1', { centre_id: 'c-x' })).rejects.toThrow(
        new NotFoundException('Centre introuvable.'),
      );
    });

    it('lance NotFoundException si le nouveau pays est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: 'a1',
        person_id: 'p1',
      });
      prismaMock.country.findUnique.mockResolvedValue(null);

      await expect(
        service.update('a1', { country_of_birth_id: 'co-x' }),
      ).rejects.toThrow(new NotFoundException('Pays introuvable.'));
    });

    it('met à jour la personne et l’agent', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: 'a1',
        person_id: 'p1',
      });
      prismaMock.application_role.findUnique.mockResolvedValue({ id: 'r1' });
      prismaMock.person.update.mockResolvedValue({ id: 'p1' });
      prismaMock.agent.update.mockResolvedValue({ id: 'a1' });

      const result = await service.update('a1', {
        first_name: 'Nouveau',
        role_id: 'r1',
      });

      expect(prismaMock.person.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { first_name: 'Nouveau' },
      });
      expect(prismaMock.agent.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 'a1' });
    });

    it('convertit date_of_birth en Date', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({
        id: 'a1',
        person_id: 'p1',
      });
      prismaMock.person.update.mockResolvedValue({ id: 'p1' });
      prismaMock.agent.update.mockResolvedValue({ id: 'a1' });

      await service.update('a1', { date_of_birth: '1995-06-15' });

      const data = prismaMock.person.update.mock.calls[0][0].data;
      expect(data.date_of_birth).toEqual(new Date('1995-06-15T00:00:00.000Z'));
    });
  });

  describe('updateStatus', () => {
    it('lance NotFoundException si l’agent est introuvable', async () => {
      prismaMock.agent.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('x', false)).rejects.toThrow(
        new NotFoundException('Agent introuvable.'),
      );
    });

    it('met à jour le statut actif', async () => {
      prismaMock.agent.findUnique.mockResolvedValue({ id: 'a1' });
      prismaMock.agent.update.mockResolvedValue({ id: 'a1', is_active: false });

      const result = await service.updateStatus('a1', false);

      expect(prismaMock.agent.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { is_active: false },
        select: { id: true, is_active: true, updated_at: true },
      });
      expect(result).toEqual({ id: 'a1', is_active: false });
    });
  });
});
