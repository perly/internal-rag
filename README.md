# Internal RAG

A NestJS, Postgres, and React app that answers questions from one company's documents. It stores document text as embeddings, retrieves the closest passages, and answers only from those passages. When nothing is close enough, it says it does not know and does not call the chat model.

## Stack

- Node.js and TypeScript
- NestJS API in `apps/api`
- React UI with Vite in `apps/web`
- Postgres 16 with pgvector, accessed through Prisma
- OpenAI `text-embedding-3-small` and a chat model set by `CHAT_MODEL` (default `gpt-4o-mini`)

## Status

| Phase | Scope | Status |
| --- | --- | --- |
| 1.1 | API, React app, Postgres connection, env example | Done |
| 1.2 | Documents, chunks, and pgvector embeddings | Done |
| 1.3 | Document create, edit, delete, and `POST /api/chat` | Done |
| 1.4 | Chat screen and document screen | Done |
| 2 | Sync external sources into the same ingest path | Google Drive only |
| 3 | Docker Compose runs Postgres, the API, and the React app | Not yet |
| 4 | Users, roles, collections, login, and sessions | Not yet |
| 5 | Jest tests for ingest, chat refusal, sync, and role filters | Not yet |

Phase 2 still needs Notion and Confluence. `docker-compose.yml` currently starts Postgres only. There is no login: every document is visible to chat.

Out of this version: a cross-encoder reranker, SSO, multi-company tenants, webhooks, Slack, and email.

## What works

Documents can be typed in or uploaded as `.md`, `.txt`, or `.pdf`. Text is split into chunks of 180 characters with 40 characters of overlap. Each chunk is hashed, and only new or changed chunks are embedded. A PDF with no text layer is stored with status `error` and no chunks.

Chat embeds the question, takes the top 20 vector hits and the top 20 full-text hits, and merges them with reciprocal rank fusion. A vector hit must reach cosine similarity `0.35`. If the merge is empty, the answer is `I don't know based on the provided documents.` Otherwise the model answers at temperature 0 and cites chunk ids.

Google Drive connects with a read-only OAuth scope, one chosen folder, and an encrypted refresh token. Sync runs on an interval and from **Sync now**. A remote delete removes that file from chat. The sync cursor moves only after a successful run.

## Run locally

```bash
docker compose up -d
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Fill `OPENAI_API_KEY` in `apps/api/.env`. For Google Drive, also set `APP_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.

```bash
npm run prisma:migrate -w @internal-rag/api
npm run dev:api
npm run dev:web
```

The API listens on `http://localhost:3001`. The UI listens on `http://localhost:5173`.
