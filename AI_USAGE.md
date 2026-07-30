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

## Day 2: Quote Engine Architecture, Atomic Versioning, & RBAC Guardrails

### 7. Immutable Quote Versioning via Compound Unique Constraints
**Context / Challenge:** B2B quotations require strict traceability. Overwriting existing quote records destroys audit trails and invalidates client negotiations, while generating brand-new, unrelated IDs for every minor revision breaks customer document tracking.

**AI Assistance:** Consulted AI to model a clean schema design pattern in Prisma that supports user-friendly, consistent quote numbering while enforcing immutable versioning at the database engine level.

**Architectural Direction & Validation:**
- Designed a compound unique index in `schema.prisma`: `@@unique([quoteNumber, version])`.
- This ensures a quote number (e.g., `QF-2026-0005`) remains constant across its entire lifecycle, while every revision increments the `version` integer (`v1`, `v2`, `v3`).
- Validated via database schema migrations (`prisma migrate dev`) and integration testing, confirming that attempting to insert a duplicate version number for the same quote throws a database-level unique constraint exception.

---

### 8. Atomic Revision Engine & Audit Trail Transactions (`$transaction`)
**Context / Challenge:** When creating a revision of an existing quote, the system must simultaneously freeze the previous version's state, mark it as historical/archived, and create a brand-new draft revision containing copied or updated line items—without creating data orphan states or race conditions.

**AI Assistance:** Leveraged AI to draft the boilerplate for a multi-operation Prisma `$transaction` within the `reviseQuote` Server Action (`src/app/actions/quotes.ts`).

**Implementation:**
- Built an atomic two-step transaction using `db.$transaction([ ... ])`:
  1. **Step A:** Updates the existing quote's status from `DRAFT` / `REJECTED` to an immutable `ARCHIVED` state.
  2. **Step B:** Generates a new record with `version = originalQuote.version + 1`, copying over or refreshing frozen line-item pricing snapshots and recalculating quote-level totals.
- Explicitly cast Decimal fields to standard TypeScript numbers (`Number(originalQuote.discountPercent)`) within inline object spreads to satisfy strict TypeScript compiler checks without resorting to `as any` type-safety overrides.

**Validation:**
- Executed programmatic CLI test suites (`src/testQuote.ts`), confirming that revising `v1` atomically updates its status to `ARCHIVED` and generates `v2` with matching `quoteNumber` and incremented version numbering.

---

### 9. Zero-Clamping Financial Calculation Pipeline
**Context / Challenge:** Floating-point precision errors and invalid negative margin/discount inputs can silently corrupt enterprise ERP pricing models and generate malformed financial totals.

**AI Assistance:** Refined mathematical algorithms and edge-case handling for unit selling prices, line-item margins, and tax aggregations in `src/lib/pricing.ts`.

**Implementation:**
- Enforced strict floor constraints using `Math.max(0, ...)` across quantities, catalog costs, margins, and discounts to prevent negative number injection.
- Implemented robust markup/margin formulas (`unitPrice = unitCost / (1 - marginPercent / 100)`) with explicit decimal-place rounding (`.toFixed(4)` for unit prices, `.toFixed(2)` for totals/taxes) to guarantee currency accuracy.

**Validation:**
- Tested against edge-case inputs (e.g., $0\%$ margins, $>100\%$ markups, high quantities), ensuring deterministic mathematical outputs across both standalone CLI execution and Next.js Server Actions.

---

### 10. Server-Side RBAC Guardrails & High-Discount Auto-Routing
**Context / Challenge:** Relying solely on client-side UI disabling to restrict unauthorized actions creates severe security vulnerabilities. Access control must be enforced at the backend mutation layer to prevent API tampering, privilege escalation, and unauthorized discounting.

**AI Assistance:** Collaborated with AI to structure centralized permission policies (`src/lib/rbac.ts`) and integrate them cleanly into Server Actions without cluttering the business logic.

**Implementation:**
- Developed centralized helper functions (`canCreateQuote`, `canReviseQuote`, `requiresManagerApproval`) based on the three-role system (`SALES`, `MANAGER`, `ADMIN`).
- Implemented **ownership-based revision logic**: `SALES` representatives are strictly restricted to revising only their own `DRAFT` or `REJECTED` quotes; attempts to modify quotes owned by peers or managers fail immediately.
- Enforced **threshold-based automatic routing**: Any quote submitted with a discount exceeding `15.0%` is dynamically routed to `PENDING_APPROVAL` status instead of standard `DRAFT`, requiring managerial sign-off.

**Validation:**
- Executed dedicated security audit scripts (`npm run test:rbac` via `src/testRbac.ts`).
- Verified that a `SALES` user attempting to revise a `MANAGER` quote triggers a hard `403 Forbidden` Server Action error, and confirmed that $20\%$ discount submissions automatically switch to `PENDING_APPROVAL` status.

---

### 11. Agentic Workflow Management via Devin (Day 2 Contributions)
**Context / Challenge:** Managing boilerplate updates across Server Actions, Prisma queries, and test-suite scaffolding while maintaining rapid development velocity against a strict assessment timeline.

**AI Assistance:** Utilized the autonomous Devin agent to implement the transactional refactoring of `src/app/actions/quotes.ts` and draft inline type-casting corrections for Prisma `Decimal`-to-TypeScript `Number` compatibility.

**Governance & Validation:**
- Conducted full code reviews of Devin's diffs to ensure adherence to existing project patterns (such as silent `revalidatePath` error handling during standalone CLI testing).
- Audited agent-generated logic via local CLI test runners (`npx tsx --env-file=.env src/testRbac.ts`) to independently prove that 403 authorization guardrails and threshold routing executed flawlessly in the Node.js runtime.

## Summary of Architectural Ownership

While LLM assistants and autonomous agents (Devin) accelerated boilerplate generation, routine debugging, and syntax lookup, all core architectural decisions — including directory boundaries (`src/`), composite natural-key design, disk-caching fallbacks, three-role RBAC governance scope, and reproducible database migration paths (`prisma migrate dev`) — were strictly directed, tested, and verified by the developer.