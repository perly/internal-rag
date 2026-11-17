DROP TABLE "sync_runs";
ALTER TABLE "connections" DROP COLUMN "folderId";
ALTER TABLE "connections" DROP COLUMN "cursor";
ALTER TABLE "connections" DROP COLUMN "lastSyncAt";
DROP TYPE "SyncRunStatus";
