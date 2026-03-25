-- CreateEnum
CREATE TYPE "provider_type" AS ENUM ('local', 'google');

-- Required extension for trigram GIN operator class used by koleksi_title_idx
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('pending', 'success', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "tipe_koleksi" AS ENUM ('anime', 'manga', 'donghua', 'drakor');

-- CreateEnum
CREATE TYPE "bookmark_status" AS ENUM ('watching', 'reading', 'completed', 'on_hold', 'dropped', 'plan_to_watch');

-- CreateEnum
CREATE TYPE "audio_type" AS ENUM ('sub', 'dub_en', 'dub_id');

-- CreateEnum
CREATE TYPE "mapping_status" AS ENUM ('pending', 'resolved', 'ignored');

-- CreateEnum
CREATE TYPE "scrape_status" AS ENUM ('success', 'error', 'warning');

-- CreateEnum
CREATE TYPE "publish_status" AS ENUM ('draft', 'published', 'hidden', 'rejected');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role_id" INTEGER,
    "password" TEXT,
    "oauth_id" TEXT,
    "avatar_url" TEXT,
    "provider" "provider_type" NOT NULL DEFAULT 'local',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "changes" JSONB,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "desc" TEXT,
    "price" BIGINT,
    "duration_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "user_id" UUID NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "price" BIGINT,
    "expired_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "amount" BIGINT,
    "payment_method" TEXT,
    "reference_id" TEXT,
    "checkout_url" TEXT,
    "status" "transaction_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koleksi" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "slug" TEXT,
    "poster_url" TEXT,
    "landscape_poster_url" TEXT,
    "alt_titles" JSONB,
    "synopsis" TEXT,
    "type" TEXT,
    "status" TEXT,
    "release_year" INTEGER,
    "koleksi_type" "tipe_koleksi",
    "publish_status" "publish_status" NOT NULL DEFAULT 'published',
    "is_nsfw" BOOLEAN NOT NULL DEFAULT false,
    "content_rating" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "koleksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koleksi_mappings" (
    "koleksi_id" UUID NOT NULL,
    "anilist_id" INTEGER,
    "myanimelist_id" INTEGER,
    "nineanime_id" TEXT,
    "komikindo_slug" TEXT,
    "last_sync_at" TIMESTAMP(3),

    CONSTRAINT "koleksi_mappings_pkey" PRIMARY KEY ("koleksi_id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_nsfw" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koleksi_genres" (
    "koleksi_id" UUID NOT NULL,
    "genre_id" UUID NOT NULL,

    CONSTRAINT "koleksi_genres_pkey" PRIMARY KEY ("koleksi_id","genre_id")
);

-- CreateTable
CREATE TABLE "anime_detail" (
    "id" UUID NOT NULL,
    "koleksi_id" UUID NOT NULL,
    "format" TEXT,
    "total_episodes" INTEGER,
    "eps_duration" INTEGER,
    "start_date" DATE,
    "end_date" DATE,
    "season" TEXT,
    "source" TEXT,
    "romaji" TEXT,
    "external_links" JSONB,
    "trailer_url" TEXT,

    CONSTRAINT "anime_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" UUID NOT NULL,
    "anime_id" UUID NOT NULL,
    "episode_number" DECIMAL(65,30),
    "title" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_sources" (
    "id" UUID NOT NULL,
    "episode_id" UUID NOT NULL,
    "server_name" TEXT,
    "audio" "audio_type" NOT NULL DEFAULT 'sub',
    "stream_type" TEXT DEFAULT 'hls',
    "url_source" TEXT,
    "subtitle_tracks" JSONB,
    "external_id" TEXT,
    "is_scraper" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "episode_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manga_detail" (
    "id" UUID NOT NULL,
    "koleksi_id" UUID NOT NULL,
    "author" TEXT,
    "artist" TEXT,
    "serialization" TEXT,
    "chapters_count" INTEGER,
    "volumes_count" INTEGER,

    CONSTRAINT "manga_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "manga_id" UUID NOT NULL,
    "chapter_number" DECIMAL(65,30),
    "title" TEXT,
    "url_source" TEXT,
    "images_array" JSONB,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" UUID NOT NULL,
    "anilist_id" INTEGER NOT NULL,
    "name" TEXT,
    "is_animation_studio" BOOLEAN,
    "description" TEXT,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koleksi_studios" (
    "koleksi_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "is_main" BOOLEAN,

    CONSTRAINT "koleksi_studios_pkey" PRIMARY KEY ("koleksi_id","studio_id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "image_url" TEXT,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_actors" (
    "id" UUID NOT NULL,
    "anilist_id" INTEGER NOT NULL,
    "name" TEXT,
    "image_url" TEXT,

    CONSTRAINT "voice_actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koleksi_characters" (
    "koleksi_id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "va_id" UUID,
    "role" TEXT,

    CONSTRAINT "koleksi_characters_pkey" PRIMARY KEY ("koleksi_id","character_id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "anilist_id" INTEGER NOT NULL,
    "name" TEXT,
    "image_url" TEXT,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koleksi_staff" (
    "koleksi_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "role" TEXT,

    CONSTRAINT "koleksi_staff_pkey" PRIMARY KEY ("koleksi_id","staff_id")
);

-- CreateTable
CREATE TABLE "koleksi_relations" (
    "id" UUID NOT NULL,
    "source_koleksi_id" UUID NOT NULL,
    "target_anilist_id" INTEGER NOT NULL,
    "relation_type" TEXT,

    CONSTRAINT "koleksi_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_mappings" (
    "id" UUID NOT NULL,
    "source_name" TEXT,
    "source_id_or_slug" TEXT,
    "scraped_title" TEXT,
    "status" "mapping_status" NOT NULL DEFAULT 'pending',
    "koleksi_id" UUID,
    "external_metadata" JSONB,
    "worker_id" INTEGER,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "pending_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_candidates" (
    "id" UUID NOT NULL,
    "pending_mapping_id" UUID NOT NULL,
    "target_anilist_id" INTEGER,
    "target_title" TEXT,
    "target_format" TEXT,
    "target_release_year" INTEGER,
    "relation_hint" TEXT,
    "similarity_score" DECIMAL(65,30),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "mapping_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_logs" (
    "id" UUID NOT NULL,
    "source_name" TEXT,
    "worker_id" INTEGER,
    "status" "scrape_status" NOT NULL,
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "scrape_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bookmarks" (
    "user_id" UUID NOT NULL,
    "koleksi_id" UUID NOT NULL,
    "status" "bookmark_status" NOT NULL DEFAULT 'plan_to_watch',
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_bookmarks_pkey" PRIMARY KEY ("user_id","koleksi_id")
);

-- CreateTable
CREATE TABLE "user_watch_histories" (
    "user_id" UUID NOT NULL,
    "episode_id" UUID NOT NULL,
    "watch_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_watch_histories_pkey" PRIMARY KEY ("user_id","episode_id")
);

-- CreateTable
CREATE TABLE "user_read_histories" (
    "user_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "last_page" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_read_histories_pkey" PRIMARY KEY ("user_id","chapter_id")
);

-- CreateTable
CREATE TABLE "airing_schedules" (
    "id" UUID NOT NULL,
    "koleksi_id" UUID NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "airing_at" TIMESTAMP(3) NOT NULL,
    "is_scraped" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "airing_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roles_title_idx" ON "roles"("title");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_type_idx" ON "admin_audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_type_entity_id_idx" ON "admin_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_plan_id_idx" ON "user_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_plan_id_idx" ON "transactions"("plan_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "koleksi_slug_key" ON "koleksi"("slug");

-- CreateIndex
CREATE INDEX "koleksi_status_idx" ON "koleksi"("status");

-- CreateIndex
CREATE INDEX "koleksi_release_year_idx" ON "koleksi"("release_year");

-- CreateIndex
CREATE INDEX "koleksi_type_idx" ON "koleksi"("type");

-- CreateIndex
CREATE INDEX "koleksi_koleksi_type_idx" ON "koleksi"("koleksi_type");

-- CreateIndex
CREATE INDEX "koleksi_publish_status_idx" ON "koleksi"("publish_status");

-- CreateIndex
CREATE INDEX "koleksi_is_nsfw_idx" ON "koleksi"("is_nsfw");

-- CreateIndex
CREATE INDEX "koleksi_title_idx" ON "koleksi" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "koleksi_mappings_anilist_id_key" ON "koleksi_mappings"("anilist_id");

-- CreateIndex
CREATE INDEX "koleksi_mappings_myanimelist_id_idx" ON "koleksi_mappings"("myanimelist_id");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "koleksi_genres_koleksi_id_idx" ON "koleksi_genres"("koleksi_id");

-- CreateIndex
CREATE INDEX "koleksi_genres_genre_id_idx" ON "koleksi_genres"("genre_id");

-- CreateIndex
CREATE UNIQUE INDEX "anime_detail_koleksi_id_key" ON "anime_detail"("koleksi_id");

-- CreateIndex
CREATE INDEX "episodes_anime_id_idx" ON "episodes"("anime_id");

-- CreateIndex
CREATE INDEX "episodes_anime_id_episode_number_idx" ON "episodes"("anime_id", "episode_number" DESC);

-- CreateIndex
CREATE INDEX "episode_sources_episode_id_idx" ON "episode_sources"("episode_id");

-- CreateIndex
CREATE UNIQUE INDEX "manga_detail_koleksi_id_key" ON "manga_detail"("koleksi_id");

-- CreateIndex
CREATE INDEX "chapters_manga_id_idx" ON "chapters"("manga_id");

-- CreateIndex
CREATE INDEX "chapters_manga_id_chapter_number_idx" ON "chapters"("manga_id", "chapter_number" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "studios_anilist_id_key" ON "studios"("anilist_id");

-- CreateIndex
CREATE INDEX "koleksi_studios_koleksi_id_idx" ON "koleksi_studios"("koleksi_id");

-- CreateIndex
CREATE INDEX "koleksi_studios_studio_id_idx" ON "koleksi_studios"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "voice_actors_anilist_id_key" ON "voice_actors"("anilist_id");

-- CreateIndex
CREATE INDEX "koleksi_characters_koleksi_id_idx" ON "koleksi_characters"("koleksi_id");

-- CreateIndex
CREATE INDEX "koleksi_characters_character_id_idx" ON "koleksi_characters"("character_id");

-- CreateIndex
CREATE INDEX "koleksi_characters_va_id_idx" ON "koleksi_characters"("va_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_anilist_id_key" ON "staff"("anilist_id");

-- CreateIndex
CREATE INDEX "koleksi_staff_koleksi_id_idx" ON "koleksi_staff"("koleksi_id");

-- CreateIndex
CREATE INDEX "koleksi_staff_staff_id_idx" ON "koleksi_staff"("staff_id");

-- CreateIndex
CREATE INDEX "koleksi_relations_source_koleksi_id_idx" ON "koleksi_relations"("source_koleksi_id");

-- CreateIndex
CREATE INDEX "pending_mappings_status_idx" ON "pending_mappings"("status");

-- CreateIndex
CREATE INDEX "pending_mappings_koleksi_id_idx" ON "pending_mappings"("koleksi_id");

-- CreateIndex
CREATE INDEX "pending_mappings_worker_id_idx" ON "pending_mappings"("worker_id");

-- CreateIndex
CREATE INDEX "mapping_candidates_pending_mapping_id_idx" ON "mapping_candidates"("pending_mapping_id");

-- CreateIndex
CREATE INDEX "mapping_candidates_pending_mapping_id_similarity_score_idx" ON "mapping_candidates"("pending_mapping_id", "similarity_score" DESC);

-- CreateIndex
CREATE INDEX "mapping_candidates_is_approved_idx" ON "mapping_candidates"("is_approved");

-- CreateIndex
CREATE INDEX "scrape_logs_status_idx" ON "scrape_logs"("status");

-- CreateIndex
CREATE INDEX "scrape_logs_worker_id_idx" ON "scrape_logs"("worker_id");

-- CreateIndex
CREATE INDEX "user_bookmarks_user_id_idx" ON "user_bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "user_bookmarks_koleksi_id_idx" ON "user_bookmarks"("koleksi_id");

-- CreateIndex
CREATE INDEX "user_bookmarks_user_id_status_idx" ON "user_bookmarks"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_watch_histories_user_id_idx" ON "user_watch_histories"("user_id");

-- CreateIndex
CREATE INDEX "user_watch_histories_episode_id_idx" ON "user_watch_histories"("episode_id");

-- CreateIndex
CREATE INDEX "user_read_histories_user_id_idx" ON "user_read_histories"("user_id");

-- CreateIndex
CREATE INDEX "user_read_histories_chapter_id_idx" ON "user_read_histories"("chapter_id");

-- CreateIndex
CREATE INDEX "airing_schedules_koleksi_id_idx" ON "airing_schedules"("koleksi_id");

-- CreateIndex
CREATE INDEX "airing_schedules_airing_at_idx" ON "airing_schedules"("airing_at");

-- CreateIndex
CREATE INDEX "airing_schedules_koleksi_id_airing_at_idx" ON "airing_schedules"("koleksi_id", "airing_at");

-- CreateIndex
CREATE INDEX "airing_schedules_is_scraped_idx" ON "airing_schedules"("is_scraped");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_mappings" ADD CONSTRAINT "koleksi_mappings_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_genres" ADD CONSTRAINT "koleksi_genres_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_genres" ADD CONSTRAINT "koleksi_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anime_detail" ADD CONSTRAINT "anime_detail_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_anime_id_fkey" FOREIGN KEY ("anime_id") REFERENCES "anime_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_sources" ADD CONSTRAINT "episode_sources_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manga_detail" ADD CONSTRAINT "manga_detail_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_manga_id_fkey" FOREIGN KEY ("manga_id") REFERENCES "manga_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_studios" ADD CONSTRAINT "koleksi_studios_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_studios" ADD CONSTRAINT "koleksi_studios_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_characters" ADD CONSTRAINT "koleksi_characters_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_characters" ADD CONSTRAINT "koleksi_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_characters" ADD CONSTRAINT "koleksi_characters_va_id_fkey" FOREIGN KEY ("va_id") REFERENCES "voice_actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_staff" ADD CONSTRAINT "koleksi_staff_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_staff" ADD CONSTRAINT "koleksi_staff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koleksi_relations" ADD CONSTRAINT "koleksi_relations_source_koleksi_id_fkey" FOREIGN KEY ("source_koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_mappings" ADD CONSTRAINT "pending_mappings_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_candidates" ADD CONSTRAINT "mapping_candidates_pending_mapping_id_fkey" FOREIGN KEY ("pending_mapping_id") REFERENCES "pending_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_watch_histories" ADD CONSTRAINT "user_watch_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_watch_histories" ADD CONSTRAINT "user_watch_histories_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_histories" ADD CONSTRAINT "user_read_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_histories" ADD CONSTRAINT "user_read_histories_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airing_schedules" ADD CONSTRAINT "airing_schedules_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
