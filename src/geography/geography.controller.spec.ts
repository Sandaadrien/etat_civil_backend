import { Test, TestingModule } from '@nestjs/testing';

import { GeographyController } from './geography.controller';
import { GeographyService } from './geography.service';

jest.mock('../lib/prisma', () => ({ prisma: {} }));

describe('GeographyController', () => {
  let controller: GeographyController;
  let service: {
    findAllCountries: jest.Mock;
    findCountryById: jest.Mock;
    findRegionsByCountry: jest.Mock;
    findDistrictsByRegion: jest.Mock;
    findCommunesByDistrict: jest.Mock;
    findFokontanyByCommune: jest.Mock;
    findCentresByFokontany: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAllCountries: jest.fn(),
      findCountryById: jest.fn(),
      findRegionsByCountry: jest.fn(),
      findDistrictsByRegion: jest.fn(),
      findCommunesByDistrict: jest.fn(),
      findFokontanyByCommune: jest.fn(),
      findCentresByFokontany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeographyController],
      providers: [{ provide: GeographyService, useValue: service }],
    }).compile();

    controller = module.get<GeographyController>(GeographyController);
  });

  it('findAllCountries délègue au service', async () => {
    service.findAllCountries.mockResolvedValue(['country']);
    await expect(controller.findAllCountries()).resolves.toEqual(['country']);
  });

  it('findCountryById délègue au service avec l’id', async () => {
    service.findCountryById.mockResolvedValue('country');
    await expect(controller.findCountryById('id')).resolves.toBe('country');
    expect(service.findCountryById).toHaveBeenCalledWith('id');
  });

  it('findRegionsByCountry délègue au service avec l’id', async () => {
    service.findRegionsByCountry.mockResolvedValue('regions');
    await expect(controller.findRegionsByCountry('id')).resolves.toBe(
      'regions',
    );
    expect(service.findRegionsByCountry).toHaveBeenCalledWith('id');
  });

  it('findDistrictsByRegion délègue au service avec l’id', async () => {
    service.findDistrictsByRegion.mockResolvedValue('districts');
    await expect(controller.findDistrictsByRegion('id')).resolves.toBe(
      'districts',
    );
    expect(service.findDistrictsByRegion).toHaveBeenCalledWith('id');
  });

  it('findCommunesByDistrict délègue au service avec l’id', async () => {
    service.findCommunesByDistrict.mockResolvedValue('communes');
    await expect(controller.findCommunesByDistrict('id')).resolves.toBe(
      'communes',
    );
    expect(service.findCommunesByDistrict).toHaveBeenCalledWith('id');
  });

  it('findFokontanyByCommune délègue au service avec l’id', async () => {
    service.findFokontanyByCommune.mockResolvedValue('fokontany');
    await expect(controller.findFokontanyByCommune('id')).resolves.toBe(
      'fokontany',
    );
    expect(service.findFokontanyByCommune).toHaveBeenCalledWith('id');
  });

  it('findCentresByFokontany délègue au service avec l’id', async () => {
    service.findCentresByFokontany.mockResolvedValue('centres');
    await expect(controller.findCentresByFokontany('id')).resolves.toBe(
      'centres',
    );
    expect(service.findCentresByFokontany).toHaveBeenCalledWith('id');
  });
});
