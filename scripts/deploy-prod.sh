
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

# Vérifier les fichiers de configuration
if [ ! -f .env.prod ]; then
  echo "ERROR: Missing .env.prod"
  exit 1
fi

echo "Checking Docker Compose configuration..."
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

# Déployer Python OCR
echo "Deploying Python OCR..."
"${COMPOSE[@]}" up -d --no-deps ocr

# Vérifier les conteneurs
echo "Checking containers..."
"${COMPOSE[@]}" ps

check_container() {
  local service="$1"
  local container_id

  container_id=$("${COMPOSE[@]}" ps -q "$service")

  if [ -z "$container_id" ]; then
    echo "ERROR: $service container not found"
    exit 1
  fi

  if [ "$(docker inspect -f '{{.State.Running}}' "$container_id")" != "true" ]; then
    echo "ERROR: $service container is not running"
    "${COMPOSE[@]}" logs --tail=100 "$service"
    exit 1
  fi

  echo "OK: $service is running"
}

check_container backend
check_container ocr

# Vérifier l'API Python OCR
echo "Checking OCR API health..."

OCR_CONTAINER=$("${COMPOSE[@]}" ps -q ocr)

OCR_READY=false

for i in $(seq 1 20); do
  if docker exec "$OCR_CONTAINER" python -c \
    "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5)" \
    >/dev/null 2>&1; then
    OCR_READY=true
    break
  fi

  echo "Waiting for OCR API... ($i/20)"
  sleep 3
done

if [ "$OCR_READY" != "true" ]; then
  echo "ERROR: OCR API health check failed"
  "${COMPOSE[@]}" logs --tail=100 ocr
  exit 1
fi

echo "OK: OCR API is responding"

echo "========================================"
echo "Deployment completed successfully"
echo "Image tag: $IMAGE_TAG"
echo "Services: PostgreSQL, NestJS, Python OCR"
echo "========================================"
