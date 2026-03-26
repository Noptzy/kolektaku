-- Create enums for admin broadcast and user notifications
CREATE TYPE "broadcast_level" AS ENUM ('maintenance', 'info');

CREATE TYPE "user_notification_type" AS ENUM ('anime_episode_update', 'admin_broadcast');

-- Remove keys flow storage
DROP TABLE IF EXISTS "user_keys";

-- Create user favorites
CREATE TABLE "user_favorites" (
  "user_id" UUID NOT NULL,
  "koleksi_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3),

  CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("user_id", "koleksi_id")
);

-- Create admin broadcasts
CREATE TABLE "admin_broadcasts" (
  "id" UUID NOT NULL,
  "admin_id" UUID NOT NULL,
  "level" "broadcast_level" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3),

  CONSTRAINT "admin_broadcasts_pkey" PRIMARY KEY ("id")
);

-- Create user notifications
CREATE TABLE "user_notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "user_notification_type" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "metadata" JSONB,
  "koleksi_id" UUID,
  "episode_id" UUID,
  "broadcast_id" UUID,
  "created_at" TIMESTAMP(3),

  CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "user_favorites_user_id_idx" ON "user_favorites"("user_id");
CREATE INDEX "user_favorites_koleksi_id_idx" ON "user_favorites"("koleksi_id");

CREATE INDEX "admin_broadcasts_admin_id_idx" ON "admin_broadcasts"("admin_id");
CREATE INDEX "admin_broadcasts_level_idx" ON "admin_broadcasts"("level");
CREATE INDEX "admin_broadcasts_created_at_idx" ON "admin_broadcasts"("created_at");

CREATE INDEX "user_notifications_user_id_idx" ON "user_notifications"("user_id");
CREATE INDEX "user_notifications_user_id_is_read_idx" ON "user_notifications"("user_id", "is_read");
CREATE INDEX "user_notifications_type_idx" ON "user_notifications"("type");
CREATE INDEX "user_notifications_created_at_idx" ON "user_notifications"("created_at");
CREATE INDEX "user_notifications_broadcast_id_idx" ON "user_notifications"("broadcast_id");
CREATE INDEX "user_notifications_episode_id_idx" ON "user_notifications"("episode_id");

-- Create unique constraints for idempotent fanout
CREATE UNIQUE INDEX "user_notifications_user_id_type_episode_id_key"
  ON "user_notifications"("user_id", "type", "episode_id");

CREATE UNIQUE INDEX "user_notifications_user_id_broadcast_id_key"
  ON "user_notifications"("user_id", "broadcast_id");

-- Add foreign keys
ALTER TABLE "user_favorites"
  ADD CONSTRAINT "user_favorites_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_favorites"
  ADD CONSTRAINT "user_favorites_koleksi_id_fkey"
  FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_broadcasts"
  ADD CONSTRAINT "admin_broadcasts_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_notifications"
  ADD CONSTRAINT "user_notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_notifications"
  ADD CONSTRAINT "user_notifications_koleksi_id_fkey"
  FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_notifications"
  ADD CONSTRAINT "user_notifications_episode_id_fkey"
  FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_notifications"
  ADD CONSTRAINT "user_notifications_broadcast_id_fkey"
  FOREIGN KEY ("broadcast_id") REFERENCES "admin_broadcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
