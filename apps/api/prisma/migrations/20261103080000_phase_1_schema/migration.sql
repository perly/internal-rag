CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "DocumentStatus" AS ENUM ('active', 'deleted', 'error');

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "contentHash" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "searchText" tsvector GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED,

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "citedChunkIds" TEXT[] NOT NULL,
    "usedModel" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chunks_documentId_chunkIndex_key" ON "chunks"("documentId", "chunkIndex");
CREATE INDEX "chunks_embedding_hnsw" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "chunks_search_gin" ON "chunks" USING gin ("searchText");

ALTER TABLE "chunks" ADD CONSTRAINT "chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
