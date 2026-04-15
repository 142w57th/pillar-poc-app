FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --include=optional && \
    ARCH="$(uname -m)" && \
    if [ "$ARCH" = "x86_64" ]; then LC_ARCH="x64"; \
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then LC_ARCH="arm64"; \
    else echo "Unsupported architecture: $ARCH"; exit 1; fi && \
    npm install --no-save \
      "lightningcss-linux-${LC_ARCH}-musl@1.32.0" \
      "@tailwindcss/oxide-linux-${LC_ARCH}-musl@4.2.2"

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
