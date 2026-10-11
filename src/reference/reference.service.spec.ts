import { Test, TestingModule } from '@nestjs/testing';

import {
  contact_type,
  document_file_side,
  enrolment_type,
  evidence_strength,
  occupancy_type,
  relationship_type,
  sex,
  sync_status,
} from '../../generated/prisma/enums';
import { ReferenceService } from './reference.service';

describe('ReferenceService', () => {
  let service: ReferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReferenceService],
    }).compile();

    service = module.get<ReferenceService>(ReferenceService);
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('doit retourner toutes les listes de références', () => {
      expect(service.getAll()).toEqual({
        occupancy_types: Object.values(occupancy_type),
        contact_types: Object.values(contact_type),
        relationship_types: Object.values(relationship_type),
        enrolment_types: Object.values(enrolment_type),
        sync_statuses: Object.values(sync_status),
        sexes: Object.values(sex),
        document_file_sides: Object.values(document_file_side),
        evidence_strengths: Object.values(evidence_strength),
      });
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

  it('getSyncStatuses retourne les valeurs de sync_status', () => {
    expect(service.getSyncStatuses()).toEqual(Object.values(sync_status));
  });

  it('getSexes retourne les valeurs de sex', () => {
    expect(service.getSexes()).toEqual(Object.values(sex));
  });

  it('getDocumentFileSides retourne les valeurs de document_file_side', () => {
    expect(service.getDocumentFileSides()).toEqual(
      Object.values(document_file_side),
    );
  });

  it('getEvidenceStrengths retourne les valeurs de evidence_strength', () => {
    expect(service.getEvidenceStrengths()).toEqual(
      Object.values(evidence_strength),
    );
  });
});
