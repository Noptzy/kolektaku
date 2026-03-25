# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kolektaku** is a full-featured anime/manga streaming and collection platform with web, mobile, and backend services. It consists of independent workspaces — there is no monorepo tooling (no Turborepo, Nx, Lerna, or root package.json). Each service/app manages its own dependencies.

## Repository Structure

```
apps/
  frontend/             # Next.js 16 web app (port 5173)
  kolektaku_mobile_app/ # Flutter mobile app
packages/
  database/             # Shared @kolektaku/database (Prisma + TypeScript)
services/
  backend/              # Express.js 5 REST API (port 4000)
  scraper_anime_manga/  # Puppeteer-based anime/manga scraper
  stream_resolver/      # HLS stream URL + subtitle extractor
```

## Commands

### Frontend (`apps/frontend`)
```bash
npm run dev        # Next.js (port 5173) + proxy server (port 3002) concurrently
npm run build      # Production build
npm run lint       # ESLint
```

### Backend (`services/backend`)
```bash
npm start          # nodemon (port 4000)
npm test           # Jest
npm run test -- --testPathPattern=<file>  # Single test file
npm run seed       # Seed database via prisma/seed.js
```

### Shared Database Package (`packages/database`)
```bash
npm run build      # tsc compile
npm run generate   # prisma generate
```

### Scraper (`services/scraper_anime_manga`)
```bash
npm run seed:anime          # Seed anime from AniList
npm run worker              # Start scraper worker
npm run pm2:phase1:all      # Seed + start with PM2
```

## Architecture

### Backend (`services/backend/src/`)

Layered MVC architecture:
- `routes/` → `controller/` → `service/` → `repository/` → Prisma
- `middleware/` — auth (Passport JWT/Google OAuth), rate limiting, validation
- `validations/` — Joi schemas for all request bodies
- `queues/` — BullMQ (job queues) + RabbitMQ (message broker) + Cron jobs
- `utils/` — Winston logger, standardized response handler

All API responses use a consistent envelope: `{ success, data, message, meta? }`.

### Frontend (`apps/frontend/src/`)

Next.js App Router structure:
- `app/` — page routes
- `components/` — React components
- `contexts/` — React Context providers for global state
- `lib/` — utilities
- `proxy_server.mjs` — local proxy for API + free proxy rotation (runs alongside Next.js)

### Database (`packages/database/prisma/schema.prisma`)

PostgreSQL via Prisma. Key model groups:
- **Auth**: `User`, `Role`, `AdminAuditLog`
- **Content**: `Koleksi`, `AnimeDetail`, `MangaDetail`, `Episode`, `EpisodeSource`, `Chapter`
- **User interactions**: `UserBookmark`, `UserWatchHistory`, `UserReadHistory`, `UserFavorite`
- **Premium/Billing**: `UserSubscription`, `MembershipPlan`, `Transaction` (Midtrans), `VoucherCode`
- **Data integration**: `KoleksiMapping` (AniList/MAL/9anime/Komikindo IDs), `PendingMapping`, `ScrapeLog`
- **Metadata**: `Genre`, `Studio`, `Character`, `VoiceActor`, `Staff`, `AiringSchedule`

UUID v7 primary keys, GIN index on `title` for full-text search, JSONB for flexible metadata.

### Scraper (`services/scraper_anime_manga/src/`)

```
scrape/     # Puppeteer + Cheerio scrapers
services/   # Business logic (fuzzy matching, AI-assisted mapping via Google Generative AI)
seeds/      # AniList data seeding scripts
scripts/    # CLI orchestration (worker, master seed)
```

Uses string-similarity for fuzzy title matching and `@google/genai` for AI-assisted content mapping.

### Stream Resolver (`services/stream_resolver/`)

Puppeteer-based extractor: intercepts network requests to capture `.m3u8` URLs and `.vtt` subtitle files, integrates with RabbitMQ for async job processing.

## Key Technologies

| Layer | Tech |
|-------|------|
| Web frontend | Next.js 16, React 19, Tailwind CSS v4, Framer Motion |
| Mobile | Flutter/Dart, media_kit, Dio, Provider |
| API | Express.js 5, Passport.js (local + Google OAuth), JWT |
| ORM | Prisma 7 with PostgreSQL |
| Job queues | BullMQ + Redis, RabbitMQ (AMQP) |
| Scraping | Puppeteer + Puppeteer-Extra, Cheerio |
| Caching | Redis (ioredis, @upstash/redis) |
| Testing | Jest + Supertest (backend) |
| Logging | Winston with daily rotation |
| Validation | Joi (backend), ESLint 9 (frontend) |
| Payment | Midtrans integration |
