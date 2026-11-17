ALTER TABLE "documents" ADD COLUMN "syncedAt" TIMESTAMP(3);
UPDATE "documents" SET "syncedAt" = "updatedAt" WHERE "origin" = 'gdrive';
