
#!/usr/bin/env bash
set -Eeuo pipefail

cd /home/cloud/apps/etat-civil

IMAGE_TAG="${1:?Missing image tag}"
export IMAGE_TAG

COMPOSE=(
  docker compose
  --env-file .env.prod
  -f compose.prod.yml
)

# Vérifier la configuration
if [ ! -f .env.prod ]; then
  echo "ERROR: Missing .env.prod"
  exit 1
fi

"${COMPOSE[@]}" config --quiet

# Démarrer PostgreSQL
echo "Starting PostgreSQL..."
"${COMPOSE[@]}" up -d --wait postgres

# Exécuter les migrations Prisma 7
echo "Running Prisma migrations..."
"${COMPOSE[@]}" run --rm --no-deps \
  --entrypoint ./node_modules/.bin/prisma \
  backend \
  --config prisma7.config.ts migrate deploy

# Déployer NestJS
echo "Deploying NestJS..."
"${COMPOSE[@]}" up -d --no-deps backend

# Vérifier le conteneur
echo "Checking container..."
"${COMPOSE[@]}" ps

CONTAINER_ID=$("${COMPOSE[@]}" ps -q backend)

if [ -z "$CONTAINER_ID" ]; then
  echo "ERROR: Backend container not found"
  exit 1
fi

if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_ID")" != "true" ]; then
  echo "ERROR: Backend container is not running"
  "${COMPOSE[@]}" logs --tail=100 backend
  exit 1
fi

echo "Deployment completed: $IMAGE_TAG"

