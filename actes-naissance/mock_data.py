from datetime import date

from extract_birth import ActeNaissance


MOCK_ACTE = ActeNaissance(
    nom="John",
    prenoms="Doe",
    genre="M",
    date_naissance=date(1885, 5, 15),
    date_naissance_originale="Faha dimy ambin'ny folo Mey taona 1885",
    lieu_naissance="Antananarivo",
    nom_mere="Soa",
    nom_pere="Paul",
)