CREATE TYPE "DocumentOrigin_new" AS ENUM ('manual', 'gdrive');

ALTER TABLE "documents" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "documents" ALTER COLUMN "origin" TYPE "DocumentOrigin_new" USING (
  CASE WHEN "origin"::text = 'upload' THEN 'manual' ELSE "origin"::text END
)::"DocumentOrigin_new";
ALTER TABLE "documents" ALTER COLUMN "origin" SET DEFAULT 'manual';

DROP TYPE "DocumentOrigin";
ALTER TYPE "DocumentOrigin_new" RENAME TO "DocumentOrigin";
