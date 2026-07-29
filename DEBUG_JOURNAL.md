## Entry #1: Postgres Local Port Conflict (Port 5432 vs 5433)

**What broke:**  
When configuring `docker-compose.yml` for the PostgreSQL 15 container, mapping the default port `5432:5432` risked colliding with local background Postgres instances or system services.

**Why it happened:**  
Running database containers on the default host port (`5432`) is a common source of silent binding failures during development, especially if another local service or leftover process is already listening on that socket.

**How I fixed it:**  
1. Remapped the host port in `docker-compose.yml` to use `5433:5432` (`"0.0.0.0:5433->5432/tcp"`).
2. Updated `DATABASE_URL` in `.env` and `prisma.config.ts` to point explicitly to `localhost:5433`.
3. Verified persistence and clean container startup using a dedicated Docker volume (`quoteflow_pgdata`).

## Entry #2: Prisma 7 Datasource URL Deprecation (P1012)

**What broke:**  
Ran `npx prisma migrate dev` to push the initial schema and hit `Error P1012: The datasource property 'url' is no longer supported in schema files`.

**Why it happened:**  
I pulled in Prisma CLI v7.x (`7.9.1`), which introduced a breaking architectural change. They completely deprecated defining `url = env("DATABASE_URL")` directly inside the `datasource db` block in `schema.prisma`. In v7+, database connection routing for CLI commands has been moved out of the schema and into a standalone TypeScript config file.

**How I fixed it:**  
1. Stripped the `url` property out of `prisma/schema.prisma` so the block only defines `provider = "postgresql"`.
2. Set up `prisma.config.ts` in the root directory to explicitly pass `process.env["DATABASE_URL"]` into the `datasource.url` configuration.
3. Re-ran `npx prisma migrate dev --name init_schema_with_auth_and_quotes` and the database synced cleanly.