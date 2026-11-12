#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_IMAGE_TAG:?DEPLOY_IMAGE_TAG is required}"

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

release_port="${RELEASE_PORT:-3001}"
export APP_PORT="$release_port"

compose=(
  docker compose
  -p imagine-studio-release
  -f docker-compose.yml
  -f docker-compose.ghcr.yml
)

export DEPLOY_IMAGE_TAG
export GHCR_IMAGE_BASE="${GHCR_IMAGE_BASE:?GHCR_IMAGE_BASE is required}"

"${compose[@]}" pull backend frontend
"${compose[@]}" up -d --no-build --remove-orphans backend frontend
"${compose[@]}" exec -T backend alembic upgrade head
"${compose[@]}" ps

printf 'Release environment is available at http://127.0.0.1:%s\n' "$release_port"
