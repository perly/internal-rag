CREATE TYPE "DocumentOrigin" AS ENUM ('manual', 'gdrive');
CREATE TYPE "Provider" AS ENUM ('gdrive');
CREATE TYPE "ConnectionStatus" AS ENUM ('active', 'error');
CREATE TYPE "SyncRunStatus" AS ENUM ('running', 'success', 'error');

CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "folderId" TEXT,
    "cursor" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "status" "ConnectionStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "SyncRunStatus" NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "documents" ADD COLUMN "origin" "DocumentOrigin" NOT NULL DEFAULT 'manual';
ALTER TABLE "documents" ADD COLUMN "connectionId" TEXT;
ALTER TABLE "documents" ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "documents_connectionId_externalId_key" ON "documents"("connectionId", "externalId");

ALTER TABLE "documents" ADD CONSTRAINT "documents_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
