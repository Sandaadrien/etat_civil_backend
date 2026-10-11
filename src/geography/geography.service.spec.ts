import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { prisma } from '../lib/prisma';
import { GeographyService } from './geography.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    country: { findMany: jest.fn(), findUnique: jest.fn() },
    region: { findMany: jest.fn(), findUnique: jest.fn() },
    district: { findMany: jest.fn(), findUnique: jest.fn() },
    commune: { findMany: jest.fn(), findUnique: jest.fn() },
    fokontany: { findMany: jest.fn(), findUnique: jest.fn() },
    centre: { findMany: jest.fn() },
  },
}));

const prismaMock = prisma as any;

describe('GeographyService', () => {
  let service: GeographyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GeographyService],
    }).compile();

    service = module.get<GeographyService>(GeographyService);
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('findAllCountries', () => {
    it('retourne les pays triés par nom', async () => {
      const countries = [{ id: '1', name: 'Madagascar' }];
      prismaMock.country.findMany.mockResolvedValue(countries);

      await expect(service.findAllCountries()).resolves.toEqual(countries);
      expect(prismaMock.country.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          iso2_code: true,
          iso3_code: true,
          name: true,
          nationality_name: true,
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findCountryById', () => {
    it('retourne le pays trouvé', async () => {
      prismaMock.country.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.findCountryById('1')).resolves.toEqual({ id: '1' });
    });

    it('lance NotFoundException si le pays est introuvable', async () => {
      prismaMock.country.findUnique.mockResolvedValue(null);

      await expect(service.findCountryById('x')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findCountryById('x')).rejects.toThrow(
        'Pays introuvable.',
      );
    });
  });

  describe('findRegionsByCountry', () => {
    it('retourne les régions du pays', async () => {
      prismaMock.country.findUnique.mockResolvedValue({ id: 'c1' });
      prismaMock.region.findMany.mockResolvedValue([{ id: 'r1' }]);

      await expect(service.findRegionsByCountry('c1')).resolves.toEqual([
        { id: 'r1' },
      ]);
      expect(prismaMock.region.findMany).toHaveBeenCalledWith({
        where: { country_id: 'c1' },
        select: { id: true, name: true, country_id: true },
        orderBy: { name: 'asc' },
      });
    });

    it('lance NotFoundException si le pays est introuvable', async () => {
      prismaMock.country.findUnique.mockResolvedValue(null);

      await expect(service.findRegionsByCountry('x')).rejects.toThrow(
        'Pays introuvable.',
      );
    });
  });

  describe('findDistrictsByRegion', () => {
    it('retourne les districts de la région', async () => {
      prismaMock.region.findUnique.mockResolvedValue({ id: 'r1' });
      prismaMock.district.findMany.mockResolvedValue([{ id: 'd1' }]);

      await expect(service.findDistrictsByRegion('r1')).resolves.toEqual([
        { id: 'd1' },
      ]);
    });

    it('lance NotFoundException si la région est introuvable', async () => {
      prismaMock.region.findUnique.mockResolvedValue(null);

      await expect(service.findDistrictsByRegion('x')).rejects.toThrow(
        'Région introuvable.',
      );
    });
  });

  describe('findCommunesByDistrict', () => {
    it('retourne les communes du district', async () => {
      prismaMock.district.findUnique.mockResolvedValue({ id: 'd1' });
      prismaMock.commune.findMany.mockResolvedValue([{ id: 'co1' }]);

      await expect(service.findCommunesByDistrict('d1')).resolves.toEqual([
        { id: 'co1' },
      ]);
    });

    it('lance NotFoundException si le district est introuvable', async () => {
      prismaMock.district.findUnique.mockResolvedValue(null);

      await expect(service.findCommunesByDistrict('x')).rejects.toThrow(
        'District introuvable.',
      );
    });
  });

  describe('findFokontanyByCommune', () => {
    it('retourne les fokontany de la commune', async () => {
      prismaMock.commune.findUnique.mockResolvedValue({ id: 'co1' });
      prismaMock.fokontany.findMany.mockResolvedValue([{ id: 'f1' }]);

      await expect(service.findFokontanyByCommune('co1')).resolves.toEqual([
        { id: 'f1' },
      ]);
    });

    it('lance NotFoundException si la commune est introuvable', async () => {
      prismaMock.commune.findUnique.mockResolvedValue(null);

      await expect(service.findFokontanyByCommune('x')).rejects.toThrow(
        'Commune introuvable.',
      );
    });
  });

  describe('findCentresByFokontany', () => {
    it('retourne les centres du fokontany', async () => {
      prismaMock.fokontany.findUnique.mockResolvedValue({ id: 'f1' });
      prismaMock.centre.findMany.mockResolvedValue([{ id: 'ce1' }]);

      await expect(service.findCentresByFokontany('f1')).resolves.toEqual([
        { id: 'ce1' },
      ]);
      expect(prismaMock.centre.findMany).toHaveBeenCalledWith({
        where: { fokontany_id: 'f1' },
        select: { id: true, code: true, name: true, fokontany_id: true },
        orderBy: { name: 'asc' },
      });
    });

    it('lance NotFoundException si le fokontany est introuvable', async () => {
      prismaMock.fokontany.findUnique.mockResolvedValue(null);

      await expect(service.findCentresByFokontany('x')).rejects.toThrow(
        'Fokontany introuvable.',
      );
    });
  });
});
