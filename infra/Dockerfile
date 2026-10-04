FROM oven/bun:1.3.8 AS runtime
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY apps/utils/package.json apps/utils/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/backend/package.json packages/backend/package.json
RUN bun install --frozen-lockfile --production \
    --filter @dorob/api --filter @dorob/worker --filter @dorob/backend \
    --filter @dorob/core --filter @dorob/db --filter @dorob/utils
COPY packages ./packages
COPY apps/backend/src ./apps/backend/src
COPY apps/worker/src ./apps/worker/src
COPY apps/utils/scrapers ./apps/utils/scrapers
USER bun

FROM runtime AS backend
ENV BACKEND_HOST=0.0.0.0 BACKEND_PORT=4000
EXPOSE 4000
CMD ["bun", "apps/backend/src/index.ts"]

FROM runtime AS worker
CMD ["bun", "apps/worker/src/index.ts"]
