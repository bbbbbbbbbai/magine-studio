# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build

WORKDIR /app
ARG VITE_REFERENCE_DATA_BASE=https://raw.githubusercontent.com/anhao/ai-pose-gallery-zh/main
ARG VITE_REFERENCE_ASSET_BASE=https://ai-pose-gallery.anhao.app
ENV VITE_REFERENCE_DATA_BASE=$VITE_REFERENCE_DATA_BASE
ENV VITE_REFERENCE_ASSET_BASE=$VITE_REFERENCE_ASSET_BASE
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
