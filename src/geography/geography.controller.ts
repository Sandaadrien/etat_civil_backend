import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { GeographyService } from './geography.service';

@Controller()
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get('countries')
  findAllCountries() {
    return this.geographyService.findAllCountries();
  }

  @Get('countries/:id')
  findCountryById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.geographyService.findCountryById(id);
  }

  @Get('countries/:id/regions')
  findRegionsByCountry(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.geographyService.findRegionsByCountry(id);
  }

  @Get('regions/:id/districts')
  findDistrictsByRegion(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.geographyService.findDistrictsByRegion(id);
  }

  @Get('districts/:id/communes')
  findCommunesByDistrict(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.geographyService.findCommunesByDistrict(id);
  }

  @Get('communes/:id/fokontany')
  findFokontanyByCommune(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.geographyService.findFokontanyByCommune(id);
  }

  @Get('fokontany/:id/centres')
  findCentresByFokontany(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.geographyService.findCentresByFokontany(id);
  }
}
