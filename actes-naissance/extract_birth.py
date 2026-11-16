import argparse
import json
import os
import re
from datetime import date
from pathlib import Path
from typing import Literal

from ollama import chat
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator

MODEL = os.getenv("OCR_MODEL", "qwen2.5:7b")


class ActeNaissance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nom: str = ""
    prenoms: str = ""
    genre: Literal["M", "F", ""] = ""
    date_naissance: str = ""
    date_naissance_originale: str = ""
    lieu_naissance: str = ""
    nom_mere: str = ""
    nom_pere: str = ""

    @field_validator("date_naissance")
    @classmethod
    def verifier_date(cls, v: str) -> str:
        if not v:
            return ""
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            return ""
        try:
            date.fromisoformat(v)  # rejette par ex. 2020-02-31
        except ValueError:
            return ""
        return v


PROMPT = """
Extrais les informations de cet acte de naissance malgache.

Le texte peut être en français ou en malgache et provenir
d'un OCR imparfait.

Règles :
- Identifie les informations concernant l'enfant.
- Distingue la date de naissance de la date de déclaration.
- Convertis la date en YYYY-MM-DD uniquement si elle est claire.
- Conserve la date écrite en toutes lettres dans le champ original.
- Genre : M ou F seulement si le document le permet.
- N'invente aucune information.
- Utilise une chaîne vide "" pour les informations absentes ou incertaines.
- N'utilise jamais null.
- Les noms des parents doivent être explicitement identifiés.

Retourne uniquement un objet JSON valide avec exactement ces clés :
{
  "nom": "",
  "prenoms": "",
  "genre": "",
  "date_naissance": "",
  "date_naissance_originale": "",
  "lieu_naissance": "",
  "nom_mere": "",
  "nom_pere": ""
}

La date_naissance doit être une chaîne YYYY-MM-DD ou "".
Le genre doit être "M", "F" ou "".

DOCUMENT :
"""


def extraire_acte(texte: str) -> ActeNaissance:
    if not texte.strip():
        raise ValueError("Le texte fourni est vide.")

    reponse = chat(
        model=MODEL,
        messages=[{"role": "user", "content": PROMPT + texte}],
        format="json",
        options={
            "temperature": 0,
            "repeat_penalty": 1.1,
            "num_predict": 512,
        },
    )

    contenu = reponse.message.content.strip()

    try:
        brut = json.loads(contenu)
        if not isinstance(brut, dict):
            raise ValueError("La réponse du modèle n'est pas un objet JSON.")

        # Le LLM peut quand même renvoyer null : on le convertit en ""
        nettoye = {
            cle: ("" if valeur is None else valeur)
            for cle, valeur in brut.items()
        }
        return ActeNaissance.model_validate(nettoye)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValueError(
            "Le modèle a répondu, mais les données "
            "ne respectent pas le format attendu."
        ) from exc


def main():
    parser = argparse.ArgumentParser(
        description="Extraction des données d'un acte de naissance"
    )
    parser.add_argument("texte", help="Fichier texte contenant l'OCR")
    parser.add_argument("-o", "--output", help="Fichier JSON de sortie")
    args = parser.parse_args()

    texte = Path(args.texte).read_text(encoding="utf-8")
    resultat = extraire_acte(texte)

    json_final = json.dumps(
        resultat.model_dump(mode="json"),
        ensure_ascii=False,
        indent=2,
    )

    if args.output:
        destination = Path(args.output)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json_final + "\n", encoding="utf-8")
        print(f"\nJSON enregistré dans : {destination}")
    else:
        print(json_final)


if __name__ == "__main__":
    main()