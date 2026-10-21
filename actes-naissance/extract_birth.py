import argparse
import json
from pathlib import Path
from datetime import date
from typing import Literal

from ollama import chat
from pydantic import BaseModel, ConfigDict, ValidationError


MODEL = "qwen2.5:7b"


class ActeNaissance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nom: str | None = None
    prenoms: str | None = None
    genre: Literal["M", "F"] | None = None
    date_naissance: date | None = None
    date_naissance_originale: str | None = None
    lieu_naissance: str | None = None
    nom_mere: str | None = None
    nom_pere: str | None = None


def extraire_acte(texte: str) -> ActeNaissance:
    if not texte.strip():
        raise ValueError("Le texte fourni est vide.")

    prompt = """
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
- Utilise null pour les informations absentes ou incertaines.
- Les noms des parents doivent être explicitement identifiés.

Retourne uniquement un objet JSON valide avec exactement ces clés :
{
  "nom": null,
  "prenoms": null,
  "genre": null,
  "date_naissance": null,
  "date_naissance_originale": null,
  "lieu_naissance": null,
  "nom_mere": null,
  "nom_pere": null
}

Les dates doivent être des chaînes YYYY-MM-DD ou null.
Le genre doit être M, F ou null.

DOCUMENT :
""" + texte

    reponse = chat(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        format="json",
        options={
            "temperature": 0,
            "repeat_penalty": 1.1,
            "num_predict": 512,
        },
    )

    contenu = reponse.message.content.strip()
    print("Réponse brute du modèle :", contenu)

    try:
        return ActeNaissance.model_validate_json(contenu)
    except ValidationError as exc:
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

    chemin = Path(args.texte)
    texte = chemin.read_text(encoding="utf-8")

    resultat = extraire_acte(texte)

    json_final = json.dumps(
        resultat.model_dump(mode="json"),
        ensure_ascii=False,
        indent=2,
    )

    if args.output:
        destination = Path(args.output)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json_final + "\n",
            encoding="utf-8",
        )
        print(f"\nJSON enregistré dans : {destination}")
    else:
        print(json_final)


if __name__ == "__main__":
    main()
