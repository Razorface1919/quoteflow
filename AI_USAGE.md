# AI Collaboration & Usage Log — QuoteFlow

> This document provides a transparent audit trail of how Artificial Intelligence (Gemini / LLM assistants and autonomous agents) was utilized during the engineering and development of QuoteFlow.
>
> In accordance with professional engineering rubrics, AI was leveraged as an architectural sounding board, boilerplate generator, refactoring assistant, and automated debugging tool. All AI-generated suggestions were strictly evaluated against project requirements, tested for edge-case failures, and manually verified before being committed to the codebase.

---

## Day 1: Foundation, Architecture, & Integration

### 1. Next.js 14 (App Router) & Auth.js Node Runtime Locking

**Context / Challenge:** Next.js 14 App Router defaults certain route handlers to the Edge Runtime, which causes fatal runtime compatibility crashes when initializing database-backed authentication adapters (such as Auth.js with Prisma/Postgres) due to missing Node.js native modules (`crypto`, `net`, `fs`).

**AI Assistance:** Consulted AI to identify the correct Next.js 14 App Router route-segment configuration pattern to force a strict Node.js runtime execution environment.

**Implementation:** Explicitly applied `export const runtime = 'nodejs';` across NextAuth API route handlers (`src/app/api/auth/[...nextauth]/route.ts`) and database utility modules.

**Validation:** Verified by executing authentication flows locally and ensuring no Edge Runtime `Module not found` or Node-compatibility exceptions were thrown in the server console.

---

### 2. Prisma 7 Postgres Adapter (`@prisma/adapter-pg`) Integration

**Context / Challenge:** Configuring Prisma 7 with explicit driver adapters (`@prisma/adapter-pg`) and TypeScript path aliases (`@/*`) within an enforced `src/` directory boundary.

**AI Assistance:** Generated boilerplate for the singleton database client initialization pattern (`src/lib/db.ts`) using `pg.Pool` and `PrismaPg` to prevent connection-pool exhaustion during hot-module reloading in development.

**Implementation:** Integrated the generated adapter wrapper and mapped imports cleanly via `@/lib/db`.

**Validation:** Executed database migrations and schema pushes without connection leaks or module-resolution drift.

---

### 3. Mouser API Integration & Offline-First Disk-Caching Pipeline

**Context / Challenge:** Relying purely on live third-party API calls (Mouser Electronics) during development introduces severe risks: API rate-limiting, network latency, and blocked development workflows when offline or lacking valid API credentials.

**AI Assistance:** Designed a "Cache-First" local filesystem strategy (`src/lib/mouser.ts`) that inspects a local `.cache/mouser/` directory for existing JSON responses before dispatching external HTTP requests.

**Implementation:**

- Implemented file-system lookups (`fs.existsSync`, `fs.readFileSync`) wrapping the API fetch layer.
- Added graceful fallbacks to return cached/mock arrays with explicit server-console warnings if `MOUSER_API_KEY` is unset.
- Configured `.gitignore` to exclude `.cache/` from version control while keeping the caching pipeline intact for local environments.

**Validation:** Tested end-to-end via Server Actions (`importPartFromMouser`), confirming that querying part `SN74HC00N` successfully read from local disk cache and populated the database in `<10ms` without triggering network calls.

---

### 4. Composite Natural Key Schema Design & Idempotent Upserts

**Context / Challenge:** Preventing duplicate inventory records during manual UI imports or automated seeding scripts when components are sourced multiple times across different B2B electronic component distributors.

**AI Assistance:** Evaluated trade-offs between surrogate UUID keys and compound unique constraints with LLM consultation; structured Prisma `upsert()` mutation payloads within automated seeding (`src/seed.ts`) and Server Actions (`src/app/actions/parts.ts`).

**Architectural Direction & Validation:**

- Directed the schema design to use a composite natural key: `@@unique([manufacturer, manufacturerPartNum])` while retaining a UUID primary key for clean relational joins.
- This guarantees vendor-agnostic deduplication (e.g., recognizing that a Texas Instruments `SN74HC00N` from Mouser is the exact same physical component as one sourced from Digi-Key or entered manually).
- Tested by executing `npm run seed` consecutively and verifying via terminal output (`Successfully upserted`) and database inspection that zero duplicate rows or unique-constraint crashes occurred.

---

### 5. Docker Compose Port Resiliency & Volume Verification

**Context / Challenge:** Resolving host-port binding collisions on default PostgreSQL port `5432` without breaking data persistence or volume mapping across container restarts.

**AI Assistance:** Consulted AI to verify clean port-mapping syntax (`5433:5432`) in `docker-compose.yml` and formalize a verification sequence to test Docker named volume persistence.

**Implementation & Validation:** Executed a full container destruction and recreation cycle (`docker compose down && docker compose up -d`), followed immediately by `npm run seed`, physically proving that database records and schema state survived container teardown on host port `5433`.

---

### 6. Agentic Debugging & Maintenance via Devin

**Context / Challenge:** Accelerating routine debugging, stack-trace analysis, and minor environment configurations without diverting developer focus from high-level system architecture.

**AI Assistance:** Leveraged Devin (an autonomous AI software engineer agent) to investigate isolated syntax errors, trace minor configuration warnings, and validate environment script execution (`--env-file=.env` compatibility with `tsx`).

**Governance & Validation:** Treated Devin as an asynchronous junior engineering contributor. All agent-proposed diffs and refactors were manually reviewed, audited against project conventions, and tested in the local sandbox before being staged or committed to Git.

---

## Summary of Architectural Ownership

While LLM assistants and autonomous agents (Devin) accelerated boilerplate generation, routine debugging, and syntax lookup, all core architectural decisions — including directory boundaries (`src/`), composite natural-key design, disk-caching fallbacks, three-role RBAC governance scope, and reproducible database migration paths (`prisma migrate dev`) — were strictly directed, tested, and verified by the developer.