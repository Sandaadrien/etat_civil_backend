# Identity Platform Backend

Backend central de la **Identity Platform**, développé avec **NestJS** et **TypeScript**.

Ce backend fournit les APIs communes aux deux applications de la plateforme :

- **APP 1 — Enrolment App** : enrôlement et création des identités par les agents habilités.
- **APP 2 — Citizen App** : consultation, utilisation et gestion de l'identité numérique par les citoyens.

## Requirement

Ollama installer localement
cd actes-naissance/
python -m pip install -r requirements.txt

commande pour lancer le LLM en local
$ uvicorn api:app --host 127.0.0.1 --port 8000 --reload

- GET /health permet de vérifier que le serveur répond.
- POST /extract reçoit un fichier sous le nom de champ file.

ouvrir swagger
http://127.0.0.1:8000/docs

## Architecture

```
APP 1 — Enrolment App
          │
          ▼
┌─────────────────────────┐
│ Identity Platform       │
│ Backend — NestJS        │
└─────────────────────────┘
          ▲
          │
APP 2 — Citizen App
```

Le backend centralise progressivement les fonctionnalités liées à :

- l'authentification et l'autorisation ;
- la gestion des identités ;
- les enrôlements ;
- les credentials et documents ;
- la vérification d'identité ;
- le consentement et le partage de données ;
- l'audit et l'historique des activités.

## Stack technique

- **NestJS**
- **TypeScript**
- **Node.js**
- **REST API**
- **Architecture modulaire**

## Installation

```
npm install
```

Créer le fichier d'environnement :

```
cp .env.example .env
```

Puis renseigner les variables nécessaires.

## Lancer le projet

### Développement

```
npm run start:dev
```

### Production

```
npm run build
npm run start:prod
```

## Tests

```
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Documentation API

En environnement de développement, la documentation **Swagger / OpenAPI** sera disponible à l'adresse configurée par l'application.

## Sécurité

Le backend est conçu selon les principes de :

- **Privacy by Design**
- **Least Privilege**
- **Secure by Default**
- **Data Minimization**
- **Zero Trust**

Les données sensibles et biométriques ne doivent pas être exposées dans les logs ou stockées en clair.

## État du projet

🚧 **En développement**

L'architecture et les APIs sont actuellement en cours d'implémentation.

## Licence

Projet sous licence **MIT**.
