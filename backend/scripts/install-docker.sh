#!/bin/sh
# zemory, the Docker install, for Linux (docs/plan/30). One line:
#
#   curl -fsSL https://raw.githubusercontent.com/ZyroFrost/Zemory/main/backend/scripts/install-docker.sh | sh
#
# Needs Docker Engine with the compose plugin, git, and Node.js >= 20 (the hooks and the `zemory` command on this machine
# are small Node scripts). A machine runs ONE install: this one does not run beside a native zemory.
#
# Options (environment):
#   ZEMORY_DIR        the clone (default ~/.local/share/zemory/app, or the existing clone)
#   ZEMORY_WORKSPACE  the folder holding your repos (required the first time)
#   ZEMORY_STORE      the memory store (default ~/zemory)
#   ZEMORY_DRIVE      (optional) the synced Drive folder for the Drive channel
set -eu
say() { printf 'zemory docker install: %s\n' "$*"; }
die() { say "$*"; exit 1; }

command -v docker >/dev/null || die "docker is missing - install Docker Engine and its compose plugin, then run this again"
docker compose version >/dev/null 2>&1 || die "the docker compose plugin is missing"
docker version --format '{{.Server.Version}}' >/dev/null 2>&1 || die "docker does not answer - start it, and add yourself to the docker group"
command -v git >/dev/null || die "git is missing"
command -v node >/dev/null || die "node is missing - install Node.js 20 or later"
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || die "node $(node --version) is too old - install 20 or later"
say "ok  docker, git, node"

DIR="${ZEMORY_DIR:-$HOME/.local/share/zemory/app}"
if [ -d "$DIR/.git" ]; then say "updating $DIR"; git -C "$DIR" pull --ff-only
else say "cloning into $DIR"; mkdir -p "$(dirname "$DIR")"; git clone https://github.com/ZyroFrost/Zemory.git "$DIR"; fi

ENVF="$DIR/.env"
WS="${ZEMORY_WORKSPACE:-}"
[ -z "$WS" ] && [ -f "$ENVF" ] && WS="$(sed -n 's/^HOST_WORKSPACE=//p' "$ENVF")"
[ -n "$WS" ] || die "set ZEMORY_WORKSPACE to the folder holding your repos, then run this again"
[ -d "$WS" ] || die "workspace folder $WS not found"
STORE="${ZEMORY_STORE:-$HOME/zemory}"
mkdir -p "$STORE/global-memory" "$STORE/data" "$STORE/no-drive"
{
  echo "HOST_HOME=$HOME"
  echo "HOST_WORKSPACE=$WS"
  echo "ZEMORY_HOSTNAME=$(hostname)"
  echo "ZEMORY_STORE=$STORE"
  echo "ZEMORY_SELF_NATIVE=$DIR"
  # the data folder the layout check reads (read-only): ZEMORY_DATA_ROOT, or the workspace itself
  echo "HOST_DATA_ROOT=${ZEMORY_DATA_ROOT:-$WS}"
  echo "HOST_DATA_ROOT_NATIVE=${ZEMORY_DATA_ROOT:-$WS}"
  if [ -n "${ZEMORY_DRIVE:-}" ]; then echo "HOST_DRIVE=$ZEMORY_DRIVE"; echo "HOST_DRIVE_NATIVE=$ZEMORY_DRIVE"; fi
} > "$ENVF"
say "wrote $ENVF"

if curl -fsS -m 3 http://127.0.0.1:4444/ping 2>/dev/null | grep -q '"runtime":"native"'; then
  die "a native zemory holds port 4444 - quit it (and remove its autostart) first: the two installs never run together"
fi

say "building and starting the container (the first build takes a while)"
# every rebuild leaves build cache and an untagged old image behind (24.6 GB after a day of rebuilds, measured
# 2026-10-22; a rebuild on a nearly full drive filled it on 2026-10-23, and the prune after it could no longer run):
# the old cache goes BEFORE the build, so the peak is one build, and again after it
docker builder prune -af >/dev/null || true
docker image prune -f >/dev/null || true
(cd "$DIR" && docker compose up -d --build)
docker builder prune -af >/dev/null || true
docker image prune -f >/dev/null || true
i=0
until curl -fsS -m 3 http://127.0.0.1:4444/ping 2>/dev/null | grep -q '"runtime":"docker"'; do
  i=$((i + 1)); [ "$i" -gt 60 ] && die "the container did not answer on http://127.0.0.1:4444 - see 'docker logs zemory'"; sleep 2
done
say "ok  the cockpit answers on http://127.0.0.1:4444"

node "$DIR/backend/scripts/host-hook.mjs" install
mkdir -p "$HOME/.local/bin"
printf '#!/bin/sh\nexec node "%s" "$@"\n' "$DIR/backend/scripts/host-cli.mjs" > "$HOME/.local/bin/zemory"
chmod +x "$HOME/.local/bin/zemory"
say "ok  the zemory command (~/.local/bin/zemory) runs in the container"
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) say "note: add ~/.local/bin to your PATH" ;; esac
say "done - Docker restarts the container at boot (restart: unless-stopped)"
