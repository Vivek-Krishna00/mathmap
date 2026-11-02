# syntax=docker/dockerfile:1

# ---- build the React client ---------------------------------------------------
FROM node:22-alpine AS client
WORKDIR /app/client
# .npmrc carries include=dev; the Vite/Tailwind build tooling needs dev deps.
COPY client/package.json client/package-lock.json client/.npmrc ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- runtime: Express serves the API and the built client ---------------------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/server
# Deliberately not copying server/.npmrc: the server needs production deps only.
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
# schema.sql + the seed runner live at the repository root. They are not used by
# CMD, but including them lets migrate/seed run as one-off jobs from this image:
#   docker run --rm <image> node src/db/migrate.js
COPY db/ /app/db/

# Cloud Run injects PORT (8080). The app must listen on it, which it does.
ENV PORT=8080
EXPOSE 8080

# The app writes nothing to disk, so the unprivileged user is enough.
USER node

CMD ["node", "src/index.js"]
