# Stage 1: Builder
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy lockfiles and database package
COPY package-lock.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/database/package-lock.json ./packages/database/
COPY services/scraper_anime_manga/package.json ./services/scraper_anime_manga/
COPY services/scraper_anime_manga/package-lock.json ./services/scraper_anime_manga/

# Install all dependencies (including devDeps)
RUN npm install --prefix packages/database
RUN npm install --prefix services/scraper_anime_manga

# Copy source code and env
COPY .env ./
COPY packages/database ./packages/database
COPY services/scraper_anime_manga ./services/scraper_anime_manga

# Generate Prisma Client & Build Database Package
RUN npm run generate --prefix packages/database
RUN npm run build --prefix packages/database

# Stage 2: Dependencies (Production only)
FROM node:20-alpine AS deps
WORKDIR /app
COPY packages/database/package.json ./packages/database/
COPY services/scraper_anime_manga/package.json ./services/scraper_anime_manga/
# Install only production dependencies
RUN npm install --prefix packages/database --omit=dev
RUN npm install --prefix services/scraper_anime_manga --omit=dev

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy production node_modules from deps stage
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/services/scraper_anime_manga/node_modules ./services/scraper_anime_manga/node_modules

# Copy database build artifacts (prisma client)
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy scraper source
COPY --from=builder /app/services/scraper_anime_manga/package.json ./services/scraper_anime_manga/
COPY --from=builder /app/services/scraper_anime_manga/src ./services/scraper_anime_manga/src

WORKDIR /app/services/scraper_anime_manga

CMD ["node", "src/scripts/worker.js"]
