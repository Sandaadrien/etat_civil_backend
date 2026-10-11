import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../lib/prisma';

@Injectable()
export class GeographyService {
  // 1. Lister les pays
  async findAllCountries() {
    return prisma.country.findMany({
      select: {
        id: true,
        iso2_code: true,
        iso3_code: true,
        name: true,
        nationality_name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // 2. Obtenir un pays
  async findCountryById(id: string) {
    const country = await prisma.country.findUnique({
      where: { id },
      select: {
        id: true,
        iso2_code: true,
        iso3_code: true,
        name: true,
        nationality_name: true,
      },
    });

    if (!country) {
      throw new NotFoundException('Pays introuvable.');
    }

    return country;
  }

  // 3. Lister les régions d'un pays
  async findRegionsByCountry(countryId: string) {
    const country = await prisma.country.findUnique({
      where: { id: countryId },
      select: { id: true },
    });

    if (!country) {
      throw new NotFoundException('Pays introuvable.');
    }

    return prisma.region.findMany({
      where: {
        country_id: countryId,
      },
      select: {
        id: true,
        name: true,
        country_id: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // 4. Lister les districts d'une région
  async findDistrictsByRegion(regionId: string) {
    const region = await prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true },
    });

    if (!region) {
      throw new NotFoundException('Région introuvable.');
    }

    return prisma.district.findMany({
      where: {
        region_id: regionId,
      },
      select: {
        id: true,
        name: true,
        region_id: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // 5. Lister les communes d'un district
  async findCommunesByDistrict(districtId: string) {
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: { id: true },
    });

    if (!district) {
      throw new NotFoundException('District introuvable.');
    }

    return prisma.commune.findMany({
      where: {
        district_id: districtId,
      },
      select: {
        id: true,
        name: true,
        district_id: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // 6. Lister les fokontany d'une commune
  async findFokontanyByCommune(communeId: string) {
    const commune = await prisma.commune.findUnique({
      where: { id: communeId },
      select: { id: true },
    });

    if (!commune) {
      throw new NotFoundException('Commune introuvable.');
    }

    return prisma.fokontany.findMany({
      where: {
        commune_id: communeId,
      },
      select: {
        id: true,
        name: true,
        commune_id: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // 7. Lister les centres d'un fokontany
  async findCentresByFokontany(fokontanyId: string) {
    const fokontany = await prisma.fokontany.findUnique({
      where: { id: fokontanyId },
      select: { id: true },
    });

    if (!fokontany) {
      throw new NotFoundException('Fokontany introuvable.');
    }

    return prisma.centre.findMany({
      where: {
        fokontany_id: fokontanyId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        fokontany_id: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
