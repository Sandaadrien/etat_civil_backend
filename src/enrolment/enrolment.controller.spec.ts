import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';

import { CreateEnrolmentDto } from './dto/create-enrolment.dto';
import { EnrolmentController } from './enrolment.controller';
import { EnrolmentService } from './enrolment.service';

type AuthenticatedRequest = Request & {
  user?: { id?: string; sub?: string };
};

const dto = {} as CreateEnrolmentDto;

describe('EnrolmentController', () => {
  let controller: EnrolmentController;
  let service: { create: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrolmentController],
      providers: [{ provide: EnrolmentService, useValue: service }],
    }).compile();

    controller = module.get<EnrolmentController>(EnrolmentController);
  });

  it('lance UnauthorizedException si aucun utilisateur n’est authentifié', async () => {
    await expect(
      controller.create(dto, {} as AuthenticatedRequest),
    ).rejects.toThrow(UnauthorizedException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('utilise req.user.id comme identifiant', async () => {
    service.create.mockResolvedValue({ ok: true });

    await expect(
      controller.create(dto, {
        user: { id: 'user-1' },
      } as AuthenticatedRequest),
    ).resolves.toEqual({ ok: true });
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('retombe sur req.user.sub', async () => {
    service.create.mockResolvedValue({ ok: true });

    await controller.create(dto, {
      user: { sub: 'user-sub' },
    } as AuthenticatedRequest);

    expect(service.create).toHaveBeenCalledWith(dto, 'user-sub');
  });
});
