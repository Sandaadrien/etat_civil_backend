import { Controller, Get } from '@nestjs/common';
import { ReferenceService } from './reference.service';

@Controller('references')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get()
  getAll() {
    return this.referenceService.getAll();
  }

  @Get('occupancy-types')
  getOccupancyTypes() {
    return this.referenceService.getOccupancyTypes();
  }

  @Get('contact-types')
  getContactTypes() {
    return this.referenceService.getContactTypes();
  }

  @Get('relationship-types')
  getRelationshipTypes() {
    return this.referenceService.getRelationshipTypes();
  }

  @Get('enrolment-types')
  getEnrolmentTypes() {
    return this.referenceService.getEnrolmentTypes();
  }

  @Get('sync-statuses')
  getSyncStatuses() {
    return this.referenceService.getSyncStatuses();
  }

  @Get('sexes')
  getSexes() {
    return this.referenceService.getSexes();
  }

  @Get('document-file-sides')
  getDocumentFileSides() {
    return this.referenceService.getDocumentFileSides();
  }

  @Get('evidence-strengths')
  getEvidenceStrengths() {
    return this.referenceService.getEvidenceStrengths();
  }
}
