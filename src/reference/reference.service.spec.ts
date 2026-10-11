import { Test, TestingModule } from '@nestjs/testing';

import {
  contact_type,
  enrolment_type,
  occupancy_type,
  relationship_type,
  sex,
} from '../../generated/prisma/enums';
import { DocumentTypeService } from '../document-type/document-type.service';
import { ReferenceService } from './reference.service';

describe('ReferenceService', () => {
  let service: ReferenceService;
  let documentTypeService: { findAll: jest.Mock };

  beforeEach(async () => {
    documentTypeService = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceService,
        { provide: DocumentTypeService, useValue: documentTypeService },
      ],
    }).compile();

    service = module.get<ReferenceService>(ReferenceService);
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('doit retourner toutes les listes de références et les types de documents', async () => {
      const documentTypes = [{ id: '1', name: 'CIN' }];
      documentTypeService.findAll.mockResolvedValue(documentTypes);

      await expect(service.getAll()).resolves.toEqual({
        enrolmentTypes: Object.values(enrolment_type),
        relationshipTypes: Object.values(relationship_type),
        occupancyTypes: Object.values(occupancy_type),
        contactTypes: Object.values(contact_type),
        sexes: Object.values(sex),
        documentTypes,
      });
      expect(documentTypeService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  it('getOccupancyTypes retourne les valeurs de occupancy_type', () => {
    expect(service.getOccupancyTypes()).toEqual(Object.values(occupancy_type));
  });

  it('getContactTypes retourne les valeurs de contact_type', () => {
    expect(service.getContactTypes()).toEqual(Object.values(contact_type));
  });

  it('getRelationshipTypes retourne les valeurs de relationship_type', () => {
    expect(service.getRelationshipTypes()).toEqual(
      Object.values(relationship_type),
    );
  });

  it('getEnrolmentTypes retourne les valeurs de enrolment_type', () => {
    expect(service.getEnrolmentTypes()).toEqual(Object.values(enrolment_type));
  });

  it('getSexes retourne les valeurs de sex', () => {
    expect(service.getSexes()).toEqual(Object.values(sex));
  });
});
