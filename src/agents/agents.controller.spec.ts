import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';

import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn((headers) => headers),
}));

jest.mock('../lib/prisma', () => ({
  prisma: { agent: { findUnique: jest.fn() } },
}));

jest.mock('../lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

const prismaMock = prisma as any;
const authMock = auth as any;

const req = { headers: { cookie: 'session=abc' } } as unknown as Request;

const adminAgent = {
  id: 'admin-agent',
  is_active: true,
  application_role: { name: 'ADMIN' },
};

describe('AgentsController', () => {
  let controller: AgentsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [{ provide: AgentsService, useValue: service }],
    }).compile();

    controller = module.get<AgentsController>(AgentsController);
  });

  describe('requireAdmin (via create)', () => {
    it('lance UnauthorizedException sans session', async () => {
      authMock.api.getSession.mockResolvedValue(null);

      await expect(controller.create(req, {} as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.create).not.toHaveBeenCalled();
    });

    it('lance ForbiddenException si aucun agent admin n’est associé', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue(null);

      await expect(controller.create(req, {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lance ForbiddenException si le rôle n’est pas ADMIN', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue({
        id: 'a1',
        is_active: true,
        application_role: { name: 'AGENT' },
      });

      await expect(controller.create(req, {} as any)).rejects.toThrow(
        'Accès réservé aux administrateurs.',
      );
    });

    it('lance ForbiddenException si le compte admin est désactivé', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue({
        id: 'a1',
        is_active: false,
        application_role: { name: 'ADMIN' },
      });

      await expect(controller.create(req, {} as any)).rejects.toThrow(
        'Votre compte administrateur est désactivé.',
      );
    });

    it('délègue la création au service si admin valide', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue(adminAgent);
      service.create.mockResolvedValue({ ok: true });

      await expect(controller.create(req, {} as any)).resolves.toEqual({
        ok: true,
      });
      expect(service.create).toHaveBeenCalledWith({});
    });
  });

  describe('findAll', () => {
    it('convertit page et limit en nombres', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue(adminAgent);

      await controller.findAll(req, '2', '25', 'jean');

      expect(service.findAll).toHaveBeenCalledWith(2, 25, 'jean');
    });

    it('utilise les valeurs par défaut', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue(adminAgent);

      await controller.findAll(req);

      expect(service.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });
  });

  describe('findOne', () => {
    it('délègue au service', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue(adminAgent);
      service.findOne.mockResolvedValue({ id: 'a1' });

      await expect(controller.findOne(req, 'a1')).resolves.toEqual({
        id: 'a1',
      });
      expect(service.findOne).toHaveBeenCalledWith('a1');
    });
  });

  describe('update', () => {
    it('délègue au service', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue(adminAgent);
      service.update.mockResolvedValue({ id: 'a1' });

      await expect(controller.update(req, 'a1', {})).resolves.toEqual({
        id: 'a1',
      });
      expect(service.update).toHaveBeenCalledWith('a1', {});
    });
  });

  describe('updateStatus', () => {
    it('interdit de désactiver son propre compte', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue(adminAgent);

      await expect(
        controller.updateStatus(req, 'admin-agent', { is_active: false }),
      ).rejects.toThrow('Vous ne pouvez pas désactiver votre propre compte.');
      expect(service.updateStatus).not.toHaveBeenCalled();
    });

    it('délègue le changement de statut', async () => {
      authMock.api.getSession.mockResolvedValue({ user: { id: 'u1' } });
      prismaMock.agent.findUnique.mockResolvedValue(adminAgent);
      service.updateStatus.mockResolvedValue({ id: 'other', is_active: false });

      await expect(
        controller.updateStatus(req, 'other', { is_active: false }),
      ).resolves.toEqual({ id: 'other', is_active: false });
      expect(service.updateStatus).toHaveBeenCalledWith('other', false);
    });
  });
});
