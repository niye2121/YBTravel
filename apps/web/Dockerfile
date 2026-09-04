# Builds the Vite/React frontend and serves the static build for preview.
#
# VITE_API_URL is a build ARG, not a runtime env var, because Vite inlines
# import.meta.env values into the JS bundle at build time — the browser
# fetches this API address directly, so it must be the server's externally
# reachable address, not an internal Docker hostname.
FROM node:20-slim AS build
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps apps
COPY packages packages
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm ci
RUN npm run build --workspace apps/web

FROM node:20-slim
WORKDIR /repo
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/apps/web apps/web
WORKDIR /repo/apps/web
EXPOSE 4173
# `vite preview` serves the already-built dist/ folder — this is a real
# preview deployment, not the dev server, so there's no source-watching or
# HMR overhead. --host makes it listen on all interfaces inside the
# container, which the compose port mapping then exposes to the host.
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]
