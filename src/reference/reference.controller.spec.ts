import { Test, TestingModule } from '@nestjs/testing';

import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';

describe('ReferenceController', () => {
  let controller: ReferenceController;
  let service: {
    getAll: jest.Mock;
    getOccupancyTypes: jest.Mock;
    getContactTypes: jest.Mock;
    getRelationshipTypes: jest.Mock;
    getEnrolmentTypes: jest.Mock;
    getSyncStatuses: jest.Mock;
    getSexes: jest.Mock;
    getDocumentFileSides: jest.Mock;
    getEvidenceStrengths: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getAll: jest.fn(),
      getOccupancyTypes: jest.fn(),
      getContactTypes: jest.fn(),
      getRelationshipTypes: jest.fn(),
      getEnrolmentTypes: jest.fn(),
      getSyncStatuses: jest.fn(),
      getSexes: jest.fn(),
      getDocumentFileSides: jest.fn(),
      getEvidenceStrengths: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferenceController],
      providers: [{ provide: ReferenceService, useValue: service }],
    }).compile();

    controller = module.get<ReferenceController>(ReferenceController);
  });

  it('getAll délègue au service', () => {
    service.getAll.mockReturnValue('all');
    expect(controller.getAll()).toBe('all');
    expect(service.getAll).toHaveBeenCalled();
  });

  it.each([
    ['getOccupancyTypes', 'occupancy-types'],
    ['getContactTypes', 'contact-types'],
    ['getRelationshipTypes', 'relationship-types'],
    ['getEnrolmentTypes', 'enrolment-types'],
    ['getSyncStatuses', 'sync-statuses'],
    ['getSexes', 'sexes'],
    ['getDocumentFileSides', 'document-file-sides'],
    ['getEvidenceStrengths', 'evidence-strengths'],
  ] as const)('%s délègue au service', (method) => {
    const fn = service[method];
    fn.mockReturnValue('value');

    expect(controller[method]()).toBe('value');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
