# zemory in a container (docs/plan/30): the whole engine - daemon, CLI, MCP, models, store, sync, graph - in one image
# that runs the same on Windows (Docker Desktop / WSL2) and Linux. A parallel path: the native install is unchanged.

FROM node:22-bookworm-slim AS build
WORKDIR /app
# a C++ toolchain only for the case fetch-prebuilds cannot fetch a native binary; git for the build's own scripts
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY . .
# fetch-prebuilds BEFORE npm ci (README: a throttled github.com pushes better-sqlite3 into node-gyp); prepare builds dist/
RUN node backend/scripts/fetch-prebuilds.mjs && npm ci && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app /app
RUN ln -s /app/dist/cli.js /usr/local/bin/zemory && chmod +x /app/dist/cli.js \
  && mkdir -p /home/node/.zemory && chown node:node /home/node/.zemory
# inside the container the daemon listens on every interface; compose publishes it on the host's 127.0.0.1 only
ENV ZEMORY_UI_HOST=0.0.0.0 NODE_ENV=production
USER node
# the store lives in a named volume (Linux file system of the VM), never a bind mount from NTFS (plan/30 §3 b)
VOLUME /home/node/.zemory
EXPOSE 4444
CMD ["node", "/app/dist/cli.js", "ui", "--no-window"]
