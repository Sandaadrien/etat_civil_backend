import io
from pathlib import Path

import fitz
import pytesseract
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile
from ollama import ResponseError
from pydantic import ValidationError

from extract_birth import extraire_acte


app = FastAPI(
    title="API d'extraction des actes de naissance",
    version="1.0.0",
    description="OCR et extraction via un LLM local.",
)

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 Mo
MAX_PDF_PAGES = 10

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | {".pdf"}


def extraire_texte_ocr(contenu: bytes, extension: str) -> str:
    textes = []

    if extension == ".pdf":
        try:
            with fitz.open(stream=contenu, filetype="pdf") as pdf:
                if len(pdf) > MAX_PDF_PAGES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Maximum {MAX_PDF_PAGES} pages par PDF.",
                    )

                for page in pdf:
                    pix = page.get_pixmap(dpi=300, alpha=False)
                    image = Image.open(
                        io.BytesIO(pix.tobytes("png"))
                    ).convert("RGB")

                    texte = pytesseract.image_to_string(
                        image,
                        lang="fra+eng",
                        config="--psm 6",
                    )
                    textes.append(texte)

        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="Impossible de lire ce PDF.",
            ) from exc

    elif extension in IMAGE_EXTENSIONS:
        try:
            with Image.open(io.BytesIO(contenu)) as image:
                image.load()
                texte = pytesseract.image_to_string(
                    image.convert("RGB"),
                    lang="fra+eng",
                    config="--psm 6",
                )
                textes.append(texte)

        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(
                status_code=400,
                detail="Le fichier image est invalide ou illisible.",
            ) from exc

    texte_complet = "\n\n".join(textes).strip()

    if not texte_complet:
        raise HTTPException(
            status_code=422,
            detail="Aucun texte reconnu dans le document.",
        )

    return texte_complet


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
def extract(file: UploadFile = File(...)):
    nom_fichier = file.filename or ""
    extension = Path(nom_fichier).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Formats acceptés : PNG, JPG, TIFF, WEBP et PDF.",
        )

    try:
        contenu = file.file.read(MAX_FILE_SIZE + 1)

        if len(contenu) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Le fichier dépasse la limite de 15 Mo.",
            )

        if not contenu:
            raise HTTPException(
                status_code=400,
                detail="Le fichier envoyé est vide.",
            )

        texte = extraire_texte_ocr(contenu, extension)

        resultat = extraire_acte(texte)

        return resultat.model_dump(mode="json")

    except HTTPException:
        raise
    except ValidationError as exc:
        raise HTTPException(
            status_code=502,
            detail="Le modèle a produit des données invalides.",
        ) from exc
    except ResponseError as exc:
        raise HTTPException(
            status_code=502,
            detail="Erreur du modèle Ollama lors de l'extraction.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Erreur interne lors du traitement du document.",
        ) from exc
