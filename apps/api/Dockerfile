# Builds and runs the NestJS API for deployment.
#
# Why two stages: the build stage needs the whole npm workspace (apps/web's
# package.json too) so `npm ci` can resolve the lockfile exactly as it does
# on a dev machine — trying to install just apps/api + packages/shared on
# their own risks a lockfile mismatch. The runtime stage then only keeps
# what's needed to run the compiled output, so the shipped image doesn't
# carry Vite, React, or any other web-only tooling.
FROM node:20-slim AS build
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps apps
COPY packages packages
RUN npm ci
RUN npm run build --workspace apps/api

FROM node:20-slim
WORKDIR /repo
ENV NODE_ENV=production
# node_modules is copied whole (not reinstalled with --omit=dev) because the
# npm workspace symlinks (node_modules/@yb-travel/*) were already set up
# correctly by the build stage's install — redoing it here risks resolving
# workspace packages differently.
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages packages
COPY --from=build /repo/apps/api apps/api
WORKDIR /repo/apps/api
EXPOSE 3001
# Re-applies the (idempotent, CREATE TABLE IF NOT EXISTS) schema on every
# start before booting the server, so a fresh Postgres volume gets its
# tables without a separate manual migration step.
CMD ["sh", "-c", "node scripts/migrate.js && node dist/main.js"]
