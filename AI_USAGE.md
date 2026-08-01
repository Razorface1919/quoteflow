# AI Collaboration & Usage Log - QuoteFlow

This document provides a transparent audit trail of how Artificial Intelligence (Gemini / LLM assistants and autonomous agents) was utilized during the engineering and development of QuoteFlow.

In accordance with professional engineering rubrics, AI was leveraged as an architectural sounding board, boilerplate generator, refactoring assistant, and automated debugging tool. All AI-generated suggestions were strictly evaluated against project requirements, tested for edge-case failures, and manually verified before being committed to the codebase.

## Part 1: Explicit AI Prompt Log (Kept / Changed / Rejected)

To demonstrate verification discipline, here are 5 specific instances of AI prompts used during development, alongside the critical evaluation of the AI's output.

### 1. The Pricing Model Correction (Rejected)

**Prompt:** "Write a TypeScript function to calculate the profit margin percentage for a quote line item given the unit cost and the unit sell price."

**AI Output:** Provided a standard markup formula: `((sellPrice - unitCost) / unitCost) * 100`.

**Action:** REJECTED.

**Rationale:** The AI conflated markup with gross margin. In enterprise B2B distribution, margin is strictly calculated against the selling price, not the cost. Blindly accepting this would have fundamentally corrupted the application's financial logic. I discarded the AI's math and manually implemented the correct enterprise formula: `((sellPrice - unitCost) / sellPrice) * 100`, alongside strict zero-clamping (`Math.max(0, ...)`) to prevent negative margins.

### 2. Next.js 15 searchParams Bug (Kept)

**Prompt:** "My Next.js App Router page is getting 'undefined' when I try to read searchParams.query inside my server component. The URL clearly has ?query=capacitor. Why is Prisma receiving an empty string?"

**AI Output:** Explained that Next.js 15 introduced a breaking change where `searchParams` is now an asynchronous Promise, not a synchronous object. Suggested adding `const params = await searchParams;`.

**Action:** KEPT.

**Rationale:** The AI accurately identified a framework-specific breaking change. The suggested asynchronous resolution fixed the Prisma filtering bug immediately.

### 3. Server-Side RBAC Guardrails (Changed)

**Prompt:** "How do I prevent a Sales user from updating a Manager's quote in Next.js? Should I use middleware?"

**AI Output:** Suggested implementing a complex Edge Middleware (`middleware.ts`) to intercept the request and check the session role before it hits the Server Action.

**Action:** CHANGED.

**Rationale:** While Edge Middleware works for broad page routing, it lacks access to the Prisma database client (due to Edge limitations) to check the ownership of the specific quote. I adapted the concept but moved the RBAC evaluation directly into the Server Action layer (`src/lib/rbac.ts`), ensuring authorization is checked atomically right before the database transaction opens.

### 4. Prisma 7 Adapter Initialization (Kept)

**Prompt:** "I'm upgrading to Prisma 7 and getting an error that PrismaClient requires a driver adapter. Provide the boilerplate to connect Prisma to a native pg.Pool in Next.js."

**AI Output:** Generated the global singleton pattern using `pg.Pool`, `PrismaPg`, and `globalThis` to prevent connection exhaustion during development hot-reloads.

**Action:** KEPT.

**Rationale:** The AI provided the exact, syntactically correct boilerplate required by the new Prisma 7 architecture, saving significant time reading API migration docs.

### 5. Composite Natural Keys (Changed)

**Prompt:** "I am pulling electronic components from the Mouser API. How do I make sure I don't insert duplicate parts if I run the seed script twice? Give me the Prisma schema update."

**AI Output:** Suggested changing the `@id` of the Part model to be the `manufacturerPartNum`.

**Action:** CHANGED.

**Rationale:** Using the MPN as the primary key is dangerous because different manufacturers can technically use the same part number. I changed the AI's approach to use a Composite Unique Constraint (`@@unique([manufacturer, manufacturerPartNum])`) while keeping a UUID as the primary `@id` for cleaner foreign-key relations in downstream tables.

## Part 2: Architectural Execution & Agentic Workflow

### 1. Next.js (App Router) & Auth.js Node Runtime Locking

**Context:** Next.js App Router defaults certain route handlers to the Edge Runtime, causing fatal compatibility crashes when initializing Auth.js with Prisma/Postgres due to missing Node.js native modules.

**Integration:** Consulted AI to identify the correct route-segment configuration. Explicitly exported `export const runtime = 'nodejs';` at the top of the NextAuth API route handler.

**Validation:** Verified by executing full authentication flows locally without triggering crypto-compatibility exceptions.

### 2. Mouser API Integration & Offline-First Disk-Caching

**Context:** Relying purely on live third-party APIs during development introduces risks of rate-limiting, network latency, and blocked workflows.

**Integration:** Designed a "Cache-First" local filesystem strategy that inspects a local `.cache/mouser/` directory for pre-existing JSON responses before dispatching HTTP requests.

**Validation:** Querying part SN74HC00N successfully read from the local disk cache and populated the database in under 10ms without triggering outbound network calls.

### 3. Docker Compose Port Resiliency & Volume Persistence

**Context:** The default PostgreSQL port (5432) was bound by a local service, causing Docker Compose to fail.

**Integration:** Consulted AI to confirm the host-to-container mapping syntax (5433:5432).

**Validation:** Remapped the port, then executed `docker compose down && docker compose up -d` followed by `npm run seed`. Confirmed volume persistence across a full container lifecycle.

### 4. Immutable Quote Versioning via Compound Constraints

**Context:** B2B quotations require strict traceability. Assigning entirely new IDs to revisions breaks document tracking.

**Integration:** Modeled a Prisma schema pattern enforcing immutable revision history via `@@unique([quoteNumber, version])`.

**Validation:** The database engine strictly prevents duplicate version integers for the same quote, eliminating race-condition duplication.

### 5. Atomic Revision Engine via $transaction

**Context:** Revising a quote requires two mutations: archiving the current version and inserting a successor. Without transactional wrapping, runtime exceptions create unrecoverable orphan states.

**Integration:** Drafted a multi-operation `db.$transaction([...])` block inside the `reviseQuote` Server Action. If either step throws, the entire transaction rolls back automatically.

**Validation:** Executed CLI test suites, confirming that revising v1 atomically transitions it to ARCHIVED and generates v2.

### 6. Prisma Decimal to TypeScript number Type-Casting

**Context:** Prisma maps PostgreSQL DECIMAL columns to Decimal.js objects, causing TypeScript errors (TS2345) when passed into RBAC utility functions expecting primitive number types.

**Integration:** Applied targeted inline casting using `Number(originalQuote.discountPercent)` within the object spread passed to `canReviseQuote`.

**Validation:** TypeScript compiler accepted the payload, and no precision loss occurred in downstream discount threshold comparisons.

### 7. App Router Form Hydration & URL State Synchronization

**Context:** Native HTML `<form>` submissions triggered full-page reloads. Passing filter values as `defaultValue` props caused UI desynchronization after URL navigation.

**Integration:** Extracted the search interface into a Client Component (`SearchFilters.tsx`). Used `useSearchParams()` to initialize local React state directly from the live URL. Replaced form submission with `router.replace()`.

**Validation:** Confirmed that navigating back and forward correctly restores the filter state from the URL rather than stale component memory.

### 8. Bypassing Aggressive Server Component Caching (force-dynamic)

**Context:** The category filter dropdown rendered empty despite the database containing seeded categories. Next.js statically generated the route during initial render against an empty database and cached the empty array.

**Integration:** Exported `export const dynamic = "force-dynamic";` at the top of `PartsCataloguePage`, forcing runtime execution.

**Validation:** Seeded new components and confirmed a browser refresh immediately populated the dropdown without requiring manual cache invalidation.

## Summary of Architectural Ownership

AI tooling, including LLM assistants and the autonomous Devin agent, accelerated well-scoped tasks: generating adapter boilerplate, drafting transaction structures, resolving type-contract mismatches, and scaffolding test runners. The role of AI was consistently advisory and generative, not decisive.

All core architectural decisions were directed, evaluated, and validated by the developer. This includes the composite natural key strategy, the disk-based offline caching pipeline, the financial correctness formulas, the RBAC security model, and the ACID-compliant atomic revision transactions. No AI-generated code was committed to the repository without manual review, local testing, and explicit developer approval.