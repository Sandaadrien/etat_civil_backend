import { Injectable } from '@nestjs/common';

import {
  occupancy_type,
  contact_type,
  relationship_type,
  enrolment_type,
  sex,
} from '../../generated/prisma/enums';

import { DocumentTypeService } from '../document-type/document-type.service';

@Injectable()
export class ReferenceService {
  constructor(private readonly documentTypeService: DocumentTypeService) {}

  async getAll() {
    const documentTypes = await this.documentTypeService.findAll();

    return {
      enrolmentTypes: this.getEnrolmentTypes(),
      relationshipTypes: this.getRelationshipTypes(),
      occupancyTypes: this.getOccupancyTypes(),
      contactTypes: this.getContactTypes(),
      sexes: this.getSexes(),
      documentTypes,
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

  getSexes() {
    return Object.values(sex);
  }
}
