#!/bin/sh
# The ONE way to rebuild the Docker install after the first install (constitution article 19: nothing temporary grows,
# the ceiling holds). Measured 2026-10-26: five bare `docker compose up -d --build` in one day left 27.7 GB of build cache
# inside the WSL disk, which never shrinks on its own. The guard blocks a bare build in this repo (marker key dockerPrune).
#
#   wsl -d <distro> -- sh backend/scripts/docker-rebuild.sh
#
# Prunes the build cache and dangling images before and after the build, then measures what Docker and the store keep
# beside the GM itself (the image, the build cache, the store minus global-memory/) and exits 1 when it is over the
# ceiling (ZEMORY_DOCKER_CAP_GB, default 10).
set -eu
DIR=$(cd "$(dirname "$0")/../.." && pwd)
CAP_GB=${ZEMORY_DOCKER_CAP_GB:-10}

prune() {
  docker builder prune -af >/dev/null 2>&1 || true
  docker image prune -f >/dev/null 2>&1 || true
}

prune
(cd "$DIR" && docker compose up -d --build)
prune

image=$(docker image inspect zemory:local --format '{{.Size}}' 2>/dev/null || echo 0)
cache=$(docker builder du 2>/dev/null | awk '/^Total:/ { v = $2 } END { print v ? v : "0B" }')
store=$(sed -n 's/^ZEMORY_STORE=//p' "$DIR/.env" 2>/dev/null | tail -1)
beside=0
if [ -n "$store" ] && [ -d "$store" ]; then
  beside=$(du -sb --exclude=global-memory "$store" 2>/dev/null | awk '{ print $1 }')
fi
total=$((image + beside))
cap=$((CAP_GB * 1024 * 1024 * 1024))
echo "docker-rebuild: image $((image / 1048576)) MB · store beside the GM $((beside / 1048576)) MB · build cache $cache · ceiling ${CAP_GB} GB"
if [ "$cache" != "0B" ]; then
  echo "docker-rebuild: OVER - the build cache is not empty after the prune ($cache)" >&2
  exit 1
fi
if [ "$total" -gt "$cap" ]; then
  echo "docker-rebuild: OVER - $((total / 1048576)) MB beside the GM, ceiling ${CAP_GB} GB: find what grew (backups · logs · models) and clean it" >&2
  exit 1
fi
echo "docker-rebuild: within the ceiling"
