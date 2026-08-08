# syntax=docker/dockerfile:1.7
# ---------- Build stage ----------
FROM oven/bun:1 AS build

WORKDIR /app

# VITE_API_URL must be present at build time — Vite inlines
# import.meta.env values into the JS bundle. Default to the
# in-cluster gateway URL.
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=${VITE_API_URL}

# Install dependencies with the lockfile for reproducible builds.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the source and build.
COPY . .
RUN bun run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# Drop default config, ship our SPA-aware one.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Static assets from the build.
COPY --from=build /app/dist /usr/share/nginx/html

# Healthcheck hits the /healthz endpoint defined in nginx.conf.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]