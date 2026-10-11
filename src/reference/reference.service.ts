import { Injectable } from '@nestjs/common';

import {
  occupancy_type,
  contact_type,
  relationship_type,
  enrolment_type,
  sync_status,
  sex,
  document_file_side,
  evidence_strength,
} from '../../generated/prisma/enums';

@Injectable()
export class ReferenceService {
  getAll() {
    return {
      occupancy_types: this.getOccupancyTypes(),
      contact_types: this.getContactTypes(),
      relationship_types: this.getRelationshipTypes(),
      enrolment_types: this.getEnrolmentTypes(),
      sync_statuses: this.getSyncStatuses(),
      sexes: this.getSexes(),
      document_file_sides: this.getDocumentFileSides(),
      evidence_strengths: this.getEvidenceStrengths(),
    };
  }

  getOccupancyTypes() {
    return Object.values(occupancy_type);
  }

  getContactTypes() {
    return Object.values(contact_type);
  }

  getRelationshipTypes() {
    return Object.values(relationship_type);
  }

  getEnrolmentTypes() {
    return Object.values(enrolment_type);
  }

  getSyncStatuses() {
    return Object.values(sync_status);
  }

  getSexes() {
    return Object.values(sex);
  }

  getDocumentFileSides() {
    return Object.values(document_file_side);
  }

  getEvidenceStrengths() {
    return Object.values(evidence_strength);
  }
}
