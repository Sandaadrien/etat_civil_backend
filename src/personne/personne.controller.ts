import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('personne')
@AllowAnonymous()
export class PersonneController {
  @Get('fictive')
  getPersonneFictive() {
    return {
      nom: 'Rakoto',
      prenoms: 'Andry Hery',
      genre: 'M',
      date_naissance: '1885-05-15',
      date_naissance_originale: "Faha dimy ambin'ny folo Mey taona 1885",
      lieu_naissance: 'Antananarivo',
      nom_mere: 'Soa',
      nom_pere: 'Paul',
    };
  }
}
