# Linux AMD64 manifests; update only after dependency/build/runtime verification.
FROM node:26.12.1-bookworm-slim@sha256:1884ec272c7c06aba7696262fb822dc602f8fa5eb978d03617d6bfe487d7ebac AS node
FROM oven/bun:1.3.8-debian@sha256:49c194493c391cc282414695a42486b5cdafd2bb339729f9571813b9845b1224 AS bun

FROM node AS dependencies
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /workspace
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/utils/package.json apps/utils/package.json
COPY apps/embedding-lab/package.json apps/embedding-lab/package.json
COPY apps/embedding-worker/package.json apps/embedding-worker/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/embedding-engine/package.json packages/embedding-engine/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY apps ./apps
COPY packages ./packages
COPY scripts/container/package-api.mjs ./scripts/container/package-api.mjs
RUN cd apps/web && NEXT_TELEMETRY_DISABLED=1 DOROB_API_URL=http://127.0.0.1:9 node node_modules/next/dist/bin/next build
RUN cd apps/api && bun build src/index.ts src/raster-worker.ts src/migrate.ts --target bun --external sharp --external swagger-ui-dist --outdir dist
RUN node scripts/container/package-api.mjs /runtime-api
RUN bun build packages/admin-auth/src/rotate.ts --target bun --outdir /runtime-auth

FROM node AS web-runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /workspace/apps/web/.next/standalone ./
COPY --from=build /workspace/apps/web/public ./apps/web/public
COPY --from=build /workspace/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM pgvector/pgvector:0.8.7-pg17-bookworm@sha256:cd4ccfdaf62cbfeb5c6ee19ef0dd663406d4ed740c320b324d016a90e85385b3 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends tini util-linux ca-certificates libstdc++6 libatomic1 && rm -rf /var/lib/apt/lists/* \
    && test "$(id -u postgres)" = 999 && test "$(id -g postgres)" = 999 \
    && groupadd --gid 10001 dorob && useradd --uid 10001 --gid 10001 --no-create-home dorob
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY --from=build /runtime-api /app/api
COPY --from=web-runtime /app /app/web
COPY --from=build /runtime-auth /app/auth
COPY scripts/container/storage.mjs scripts/container/supervisor.mjs scripts/container/health.mjs scripts/container/transfer.mjs scripts/container/archive.mjs scripts/container/entrypoint.sh /app/container/
RUN chmod 0755 /app/container/entrypoint.sh && mkdir /data && chown -R 10001:10001 /app/web/apps/web/.next
WORKDIR /app
EXPOSE 3000 3001
HEALTHCHECK --interval=15s --timeout=6s --start-period=130s --retries=3 CMD ["node", "/app/container/health.mjs"]
ENTRYPOINT ["/usr/bin/tini", "--", "/app/container/entrypoint.sh"]
CMD ["start"]
