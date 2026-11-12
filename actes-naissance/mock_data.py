from datetime import date

from extract_birth import ActeNaissance


MOCK_ACTE = ActeNaissance(
    nom="RAKOTO",
    prenoms="Jean Pierre",
    genre="M",
    date_naissance=date(1995, 5, 15),
    date_naissance_originale="Faha dimy ambin'ny folo Mey taona 1995",
    lieu_naissance="Antananarivo",
    nom_mere="RABE Marie",
    nom_pere="RAKOTO Paul",
)