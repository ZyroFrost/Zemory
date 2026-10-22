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
# web capture (plan/30 §3h): the chat sites refuse a headless browser, so Chromium draws on a virtual display (Xvfb);
# x11vnc + websockify + noVNC show that display as a web page, where the user signs in once. procps: the browser sweep
# lists processes with `ps`.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git procps \
     chromium fonts-liberation fonts-noto-core xvfb x11vnc novnc websockify \
  && rm -rf /var/lib/apt/lists/*
COPY backend/scripts/docker-entrypoint.sh /usr/local/bin/zemory-entrypoint
# the clone's .git is mounted at /app/.git (compose): its owner is the host's user, so git must not refuse it
RUN git config --system --add safe.directory '*'
# Xvfb runs as the image's user, which may not create the X socket folder itself
RUN mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix
# a clone made with core.autocrlf may hold CRLF despite .gitattributes: strip a trailing control character (the CR)
RUN sed -i 's/[[:cntrl:]]$//' /usr/local/bin/zemory-entrypoint && chmod +x /usr/local/bin/zemory-entrypoint
COPY --from=build --chown=node:node /app /app
# the store is /home/node/zemory, bind-mounted from the host's Linux file system (WSL ext4 on Windows), never NTFS
# (plan/30 §3c): global-memory/ travels to other machines, data/ stays on this one - the pointer names both
RUN ln -s /app/dist/cli.js /usr/local/bin/zemory && chmod +x /app/dist/cli.js \
  && mkdir -p /home/node/.zemory /home/node/zemory \
  && printf '{"dataDir":"/home/node/zemory/data","memoryRoot":"/home/node/zemory/global-memory"}\n' > /home/node/.zemory/location.json \
  && chown -R node:node /home/node/.zemory /home/node/zemory
# inside the container the daemon listens on every interface; compose publishes it on the host's 127.0.0.1 only
# ZEMORY_RUNTIME: /ping says "docker", so a native zemory on this machine refuses to run beside it (plan/30 §0)
ENV ZEMORY_UI_HOST=0.0.0.0 NODE_ENV=production ZEMORY_RUNTIME=docker ZEMORY_BROWSER=/usr/bin/chromium DISPLAY=:99
USER node
# 4444 the cockpit · 6080 the sign-in view of the capture browser · 21038 the peer-to-peer channel
EXPOSE 4444 6080 21038
ENTRYPOINT ["/usr/local/bin/zemory-entrypoint"]
CMD ["node", "/app/dist/cli.js", "ui", "--no-window"]
