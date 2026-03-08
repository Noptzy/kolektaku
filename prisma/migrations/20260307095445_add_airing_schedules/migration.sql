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
CREATE INDEX "airing_schedules_koleksi_id_idx" ON "airing_schedules"("koleksi_id");

-- CreateIndex
CREATE INDEX "airing_schedules_airing_at_idx" ON "airing_schedules"("airing_at");

-- CreateIndex
CREATE INDEX "airing_schedules_koleksi_id_airing_at_idx" ON "airing_schedules"("koleksi_id", "airing_at");

-- CreateIndex
CREATE INDEX "airing_schedules_is_scraped_idx" ON "airing_schedules"("is_scraped");

-- AddForeignKey
ALTER TABLE "airing_schedules" ADD CONSTRAINT "airing_schedules_koleksi_id_fkey" FOREIGN KEY ("koleksi_id") REFERENCES "koleksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
