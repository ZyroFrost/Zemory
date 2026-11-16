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
#
#   wsl -d <distro> -- sh backend/scripts/docker-rebuild.sh --detach
#
# --detach: the build runs as a systemd user unit (zemory-rebuild, nice 19) instead of a child of the calling shell, so a
# closed window or an agent harness reaping its own children on a low-memory machine no longer kills it halfway (measured
# 2026-11-13: Claude Code killed the build with Windows at 1.8 GB free, while WSL itself had 1.3 GB + 3.7 GB swap left).
# setsid/nohup is not enough: WSL ends every process of a call when wsl.exe returns (measured 2026-11-16: a setsid sleep
# was gone 20 s later; the same sleep under systemd-run --user lived). The user unit needs linger (the installer sets it;
# by hand: wsl -d <distro> -u root -- loginctl enable-linger <user>); without it the build runs attached and says so.
# It never waits for memory: WSL is capped (.wslconfig) and leans on its swap, so little RAM means a slower build, not a
# failed one. Output is appended to <store>/data/logs/docker-rebuild.log (never deleted - rule 02-97); each run ends with
# the line "rebuild finished, exit <code>".
set -eu
DIR=$(cd "$(dirname "$0")/../.." && pwd)
CAP_GB=${ZEMORY_DOCKER_CAP_GB:-10}
SELF="$DIR/backend/scripts/docker-rebuild.sh"

if [ "${1:-}" = "--detach" ]; then
  store=$(sed -n 's/^ZEMORY_STORE=//p' "$DIR/.env" 2>/dev/null | tail -1)
  log="${store:-$HOME}/data/logs/docker-rebuild.log"
  mkdir -p "$(dirname "$log")"
  mem=$(awk '/^MemAvailable:/ { m = $2 } /^SwapFree:/ { s = $2 } END { printf "%d MB free + %d MB swap", m / 1024, s / 1024 }' /proc/meminfo)
  linger=$(loginctl show-user "$(id -un)" -p Linger --value 2>/dev/null || true)
  if ! command -v systemd-run >/dev/null 2>&1 || [ "$linger" != "yes" ]; then
    echo "docker-rebuild: cannot detach - WSL ends a job when the wsl call returns unless systemd holds it, and linger is off." >&2
    echo "  once, as root: wsl -d <distro> -u root -- loginctl enable-linger $(id -un) - running attached now ($mem)" >&2
    exec sh "$SELF"
  fi
  if systemctl --user -q is-active zemory-rebuild 2>/dev/null; then
    echo "docker-rebuild: already running (systemctl --user status zemory-rebuild) - log $log"
    exit 0
  fi
  systemctl --user reset-failed zemory-rebuild >/dev/null 2>&1 || true
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) rebuild started, detached · $mem" >> "$log"
  systemd-run --user --quiet --unit=zemory-rebuild --collect --nice=19 --setenv=ZEMORY_REBUILD_DETACHED=1 \
    sh -c 'exec sh "$0" >> "$1" 2>&1 < /dev/null' "$SELF" "$log"
  echo "docker-rebuild: running detached (systemd user unit zemory-rebuild) · $mem - a low figure makes it slower, it does not stop it"
  echo "docker-rebuild: log $log - the run ends with 'rebuild finished, exit <code>'"
  exit 0
fi
if [ "${ZEMORY_REBUILD_DETACHED:-}" = "1" ]; then
  trap 'rc=$?; echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) rebuild finished, exit $rc"' EXIT
fi

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
