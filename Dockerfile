# zemory in a container (docs/plan/30): the whole engine - daemon, CLI, MCP, models, store, sync, graph - in one image
# that runs the same on Windows (Docker Desktop / WSL2) and Linux. A parallel path: the native install is unchanged.

FROM node:22-bookworm-slim AS build
WORKDIR /app
# a C++ toolchain only for the case fetch-prebuilds cannot fetch a native binary; git for the build's own scripts
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
# dependencies first, from the manifests only, so a code change reuses this layer (the first build took 23 min)
COPY package.json package-lock.json ./
COPY backend/scripts/fetch-prebuilds.mjs backend/scripts/fetch-prebuilds.mjs
# fetch-prebuilds BEFORE the install (README: a throttled github.com pushes better-sqlite3 into node-gyp); the root
# package's own `prepare` (the build) needs the sources, so it is skipped here and the dependencies' scripts run by rebuild
RUN node backend/scripts/fetch-prebuilds.mjs && npm ci --ignore-scripts && npm rebuild
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app /app
# the store is /home/node/zemory, bind-mounted from the host's Linux file system (WSL ext4 on Windows), never NTFS
# (plan/30 §3c): global-memory/ travels to other machines, data/ stays on this one - the pointer names both
RUN ln -s /app/dist/cli.js /usr/local/bin/zemory && chmod +x /app/dist/cli.js \
  && mkdir -p /home/node/.zemory /home/node/zemory \
  && printf '{"dataDir":"/home/node/zemory/data","memoryRoot":"/home/node/zemory/global-memory"}\n' > /home/node/.zemory/location.json \
  && chown -R node:node /home/node/.zemory /home/node/zemory
# inside the container the daemon listens on every interface; compose publishes it on the host's 127.0.0.1 only
# ZEMORY_RUNTIME: /ping says "docker", so a native zemory on this machine refuses to run beside it (plan/30 §0)
ENV ZEMORY_UI_HOST=0.0.0.0 NODE_ENV=production ZEMORY_RUNTIME=docker
USER node
EXPOSE 4444
CMD ["node", "/app/dist/cli.js", "ui", "--no-window"]
