# Stage 1: Builder
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy lockfiles
COPY package-lock.json ./
COPY services/stream_resolver/package.json ./services/stream_resolver/
COPY services/stream_resolver/package-lock.json ./services/stream_resolver/

# Install dependencies (all)
RUN npm install --prefix services/stream_resolver

# Copy service source
COPY services/stream_resolver ./services/stream_resolver

# Stage 2: Dependencies (Production only)
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/stream_resolver/package.json ./services/stream_resolver/
RUN npm install --prefix services/stream_resolver --omit=dev

# Stage 3: Runner
FROM node:20-alpine AS runner

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/services/stream_resolver/node_modules ./services/stream_resolver/node_modules

# Copy service source
COPY --from=builder /app/services/stream_resolver ./services/stream_resolver

WORKDIR /app/services/stream_resolver

EXPOSE 5790

CMD ["node", "index.js"]
