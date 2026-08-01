# QuoteFlow — Technical Debug Journal

> This journal documents real engineering challenges, edge-case failures, and architectural refactors encountered during the development of QuoteFlow. Each entry captures the exact error signature, root-cause analysis, and practical resolution to maintain an authentic, defensible log of technical decision-making.

---

## [Entry 01] Prisma 7 Driver Adapter & Native PG Connection Pool Misfire

### 1. Issue & Error Signature

When attempting to execute the database seeding pipeline via `npx prisma db seed`, the process failed abruptly with the following initialization error:

```
PrismaClientInitializationError: PrismaClient was instantiated without any options.
A driver adapter is required to connect to your database.
Pass a driver adapter to the PrismaClient constructor, for example:
  import { PrismaPg } from '@prisma/adapter-pg'
  import { PrismaClient } from './generated/prisma/client'
```

### 2. Root Cause & Architectural Context

- **Prisma 7 Breaking Change:** Prisma v7 completely removed the legacy default behavior where `new PrismaClient()` automatically read `DATABASE_URL` and managed binary Rust query engines under the hood.
- **Mandatory Driver Adapters:** In modern serverless/edge-ready setups, Prisma 7 requires explicit driver adapters (`@prisma/adapter-pg`) coupled with native database connection drivers (`pg` / `pg.Pool`) to handle raw wire-protocol database communication.

### 3. Resolution & Implementation

Installed official PostgreSQL driver dependencies:

```bash
npm install pg @prisma/adapter-pg
npm install -D @types/pg
```

Refactored both the application database singleton (`lib/db.ts`) and the CLI seeder (`src/seed.ts`) to initialize a native `pg.Pool` instance and wrap it inside `PrismaPg`:

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
```

Ensured `src/seed.ts` gracefully closes both the Prisma client (`$disconnect()`) and the underlying `pg.Pool` (`pool.end()`) upon script exit to avoid hanging CLI processes.

---

## [Entry 02] Auth.js v5 & App Router Edge Runtime Compatibility Misfire with bcryptjs

### 1. Issue & Error Signature

During initial Auth.js v5 setup, password hash verification within API route handlers failed silently or threw stream execution exceptions during credentials evaluation:

```
Error: The edge runtime does not support Node.js 'crypto' or native binary modules relied upon by bcryptjs.
```

### 2. Root Cause & Architectural Context

- Next.js App Router aggressively defaults route handlers (including `app/api/auth/[...nextauth]/route.ts`) to the **Edge Runtime** when bundled under modern toolchains.
- `bcryptjs` relies on standard Node.js crypto primitives and buffers that cannot execute within lightweight Edge isolate environments.

### 3. Resolution & Implementation

Enforced explicit Node.js runtime binding on the authentication route handler by exporting the runtime flag at the top of `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth";

export const runtime = "nodejs"; // Forces Next.js compiler to run handler in Node.js runtime

export const { GET, POST } = handlers;
```

This guarantees that cryptographic hash comparisons during authentication execute reliably inside a full Node environment.

---

## [Entry 03] Manufacturer Part Catalog Duplication & Composite Natural Key Migration

### 1. Issue & Error Signature

During initial data modeling for electronic components (`Part` model), using a single surrogate primary key (`id String @id @default(uuid())`) created a race-condition vulnerability where concurrent distributor API ingestions could insert duplicate catalog items for identical physical components from different suppliers.

### 2. Root Cause & Architectural Context

In B2B quotation management, different distributors often use their own internal SKU numbers, but physical components are universally uniquely identified by their **Manufacturer** and **Manufacturer Part Number (MPN)**. Relying solely on a surrogate UUID primary key allowed duplicate MPNs to proliferate if the database lacked a compound constraint, complicating Bill of Materials (BOM) matching.

### 3. Resolution & Implementation

Refactored `prisma/schema.prisma` to enforce a **Composite Unique Natural Key** across `manufacturer` and `manufacturerPartNum`, while retaining a UUID for clean foreign-key joins in downstream quotation line items:

```prisma
model Part {
  id                  String   @id @default(uuid())
  manufacturer        String
  manufacturerPartNum String
  description         String
  unitPrice           Float
  inStock             Int      @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([manufacturer, manufacturerPartNum])
  @@index([manufacturerPartNum])
}
```

Updated the automated seeding script (`src/seed.ts`) to leverage Prisma's `upsert` mechanism targeting the compound unique index, guaranteeing idempotent data ingestion across repeated catalog syncs:

```typescript
await prisma.part.upsert({
  where: {
    manufacturer_manufacturerPartNum: {
      manufacturer: partData.manufacturer,
      manufacturerPartNum: partData.manufacturerPartNum,
    },
  },
  update: {
    unitPrice: partData.unitPrice,
    inStock: partData.inStock,
  },
  create: partData,
});
```

---

## [Entry 04] Host Port Collision & Idempotent Container Persistence Verification

### 1. Issue & Error Signature

When spinning up the local PostgreSQL container via Docker Compose, initialization failed due to a host port binding collision:

```
Error response from daemon: driver failed programming external connectivity on endpoint quoteflow_postgres:
Bind for 0.0.0.0:5432 failed: port is already allocated
```

### 2. Root Cause & Architectural Context

An existing local system database service was already bound to the standard PostgreSQL port (`5432`). In containerized development environments, mapping directly to default service ports risks conflicts with ambient developer tooling.

### 3. Resolution & Implementation

Reconfigured `docker-compose.yml` to map container port `5432` to host port `5433` (`5433:5432`) and updated `DATABASE_URL` in `.env` accordingly.

To confirm that changing the port mapping did not orphan persistent volume mounts or break upsert idempotency, executed a full container teardown and consecutive seeding verification:

```powershell
# 1. Verify container destruction and recreation
docker compose down && docker compose up -d

# 2. Verify non-destructive idempotent upsert on existing rows
npm run seed
```

**Verification Output:**

```
[Mouser API] Cache HIT for query: "SN74HC00N"
  ✅ Successfully upserted: [Texas Instruments] SN74HC00N ($0.45)
🎉 Bulk seeding complete! Successfully seeded 1 parts.
```

This confirmed that Docker volume data persisted reliably across container lifecycles on port `5433` and that consecutive seeding operations cleanly updated existing rows without throwing unique constraint violations.

---

## [Entry 05] Immutable Version Tracking via Compound Unique Indexing (`@@unique([quoteNumber, version])`)

### 1. Issue & Error Signature

When engineering the `Quote` model for multi-version B2B negotiations, relying on an auto-incrementing integer or isolated unique `quoteNumber` field either prevented creating multiple revisions for the same customer negotiation or generated unrelated identifier strings (`QF-2026-0001` vs `QF-2026-0002`) that broke document grouping.

### 2. Root Cause & Architectural Context

In enterprise ERP systems, a quotation must retain a consistent parent reference number across its entire negotiation lifecycle while preserving an immutable history of past revisions. A standard `@unique` constraint on `quoteNumber` blocks revision creation, while omitting uniqueness entirely exposes the table to duplicate draft generation under concurrent requests.

### 3. Resolution & Implementation

Enforced a **Compound Unique Index** across `quoteNumber` and `version` within `prisma/schema.prisma`:

```prisma
model Quote {
  id          String      @id @default(uuid())
  quoteNumber String
  version     Int         @default(1)
  status      QuoteStatus @default(DRAFT)
  // ... attributes

  @@unique([quoteNumber, version])
  @@index([quoteNumber])
}
```

This ensures that while multiple database records can share the exact same `quoteNumber` (e.g., `QF-2026-0005`), the database engine strictly prohibits duplicate version integers for that quote, guaranteeing deterministic version ordering (`v1`, `v2`, `v3`) without race conditions.

---

## [Entry 06] Prisma `Decimal` to Standard TypeScript `number` Type Mismatch in Guardrail Spread

### 1. Issue & Error Signature

During compilation of the `reviseQuote` Server Action, passing the fetched `originalQuote` object into the authorization helper `canReviseQuote` triggered a strict TypeScript compiler error:

```
TS2345: Argument of type '{ discountPercent: Decimal | null; ... }' is not assignable to parameter of type '{ discountPercent?: number | undefined; ... }'.
  Type 'Decimal' is not assignable to type 'number'.
```

### 2. Root Cause & Architectural Context

Prisma maps PostgreSQL `DECIMAL` / `NUMERIC` database columns to JavaScript `Decimal.js` objects to prevent floating-point precision loss. However, internal utility functions (`src/lib/rbac.ts` and `src/lib/pricing.ts`) expect primitive TypeScript `number` types for threshold and percentage comparisons. Passing raw Prisma query payloads directly into pure utility functions causes type-contract violations.

### 3. Resolution & Implementation

Refactored the payload argument passed to `canReviseQuote` to explicitly cast Prisma's optional `Decimal` objects to standard JavaScript numbers via destructuring, avoiding `as any` type-safety overrides:

```typescript
// Enforce strict type casting from Prisma Decimal to TS Number
if (!canReviseQuote(user, {
  ...originalQuote,
  discountPercent: originalQuote.discountPercent
    ? Number(originalQuote.discountPercent)
    : undefined,
})) {
  throw new Error(
    `403 Forbidden: (${user.role}) user cannot revise Quote ${originalQuote.quoteNumber}. Either ownership mismatch or status is immutable.`
  );
}
```

---

## [Entry 07] Atomic Version Archiving & Race-Condition Prevention via Multi-Operation `$transaction`

### 1. Issue & Error Signature

When executing quote revisions without wrapping mutations in an atomic database transaction, an exception thrown during new version creation left the original quote in a permanently altered `ARCHIVED` state without generating a valid successor, resulting in orphaned customer records.

### 2. Root Cause & Architectural Context

Revising a quote requires two tightly coupled database writes:

1. **Demoting** the existing active version (`DRAFT`, `REJECTED`) to an immutable `ARCHIVED` status.
2. **Inserting** the successor version (`version = N + 1`) along with newly calculated or cloned line items.

If executed sequentially without ACID transactional guarantees, intermittent server failures or schema validation errors can break state integrity between the old and new version records.

### 3. Resolution & Implementation

Wrapped the revision sequence inside an atomic two-step Prisma transaction (`db.$transaction`). If either step fails, the entire database mutation rolls back automatically:

```typescript
const newVersionNumber = originalQuote.version + 1;

const [archivedQuote, revisedQuote] = await db.$transaction([
  // Step A: Mark previous quote version as ARCHIVED
  db.quote.update({
    where: { id: originalQuote.id },
    data: { status: QuoteStatus.ARCHIVED },
  }),

  // Step B: Insert successor version under the identical quoteNumber
  db.quote.create({
    data: {
      quoteNumber: originalQuote.quoteNumber,
      version: newVersionNumber,
      status: QuoteStatus.DRAFT,
      subtotal: totals.subtotal,
      discountPercent: totals.discountPercent,
      taxRate: totals.taxRate,
      totalAmount: totals.totalAmount,
      customerId: originalQuote.customerId,
      createdById: input.updatedById,
      lineItems: {
        create: lineItemsData,
      },
    },
    include: {
      lineItems: true,
      customer: true,
    },
  }),
]);
```

---

## [Entry 08] Server-Side RBAC Guardrails & Threshold-Based High-Discount Routing

### 1. Issue & Error Signature

During security testing of API endpoints and Server Actions, relying solely on client-side UI disabling permitted unauthorized `SALES` users to submit API payloads that revised peer-owned quotations and applied unapproved discount percentages exceeding enterprise margins (`> 15.0%`).

### 2. Root Cause & Architectural Context

Client-side restrictions can be bypassed using REST clients or browser console API invocations. Enterprise ERP systems require mandatory access control and approval governance enforced directly at the **server mutation layer** before initiating database transactions.

### 3. Resolution & Implementation

Implemented centralized RBAC evaluation policies in `src/lib/rbac.ts` and embedded explicit authorization guardrails at the entry point of both `createQuote` and `reviseQuote` Server Actions (`src/app/actions/quotes.ts`):

**Ownership-Based Revision Control:** Evaluates role and record ownership before transaction initiation. Attempting to revise a quote owned by another user immediately halts execution:

```typescript
if (!canReviseQuote(user, quotePayload)) {
  throw new Error(
    `403 Forbidden: (${user.role}) user cannot revise Quote ${originalQuote.quoteNumber}. Either ownership mismatch or status is immutable.`
  );
}
```

**Threshold-Based Approval Routing:** Dynamic evaluation of the submitted discount percentage routes high-margin quotes directly to managerial review (`PENDING_APPROVAL`):

```typescript
const discountVal = input.discountPercent || 0;
const initialStatus = requiresManagerApproval(discountVal)
  ? QuoteStatus.PENDING_APPROVAL
  : QuoteStatus.DRAFT;
```

---

## [Entry 09] Next.js App Router Form Hydration & URL State Synchronization

### 1. Issue & Error Signature

When implementing the multi-parameter search interface (keyword and category) for the Parts Catalogue, the native HTML `<form>` triggered full-page reloads, and the UI `<select>` dropdowns failed to reflect the active filters after navigation.

### 2. Root Cause & Architectural Context

In the Next.js App Router paradigm, relying on standard HTML form submissions or basic `defaultValue` props within Server Components creates state desynchronization. React's `defaultValue` only fires on the initial mount. When URL parameters change, the Server Component re-renders the data, but the unmounted Client DOM retains stale input values, causing the visual state of the form to detach from the actual URL state.

### 3. Resolution & Implementation

Decoupled the search interface into a dedicated Client Component (`SearchFilters.tsx`) to imperatively manage routing and state synchronization using Next.js hooks (`useRouter`, `useSearchParams`, `usePathname`):

```typescript
// Safely initialize client state directly from the active URL parameters
const [query, setQuery] = useState(searchParams.get("query") || "");
const [category, setCategory] = useState(searchParams.get("category") || "");

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  const params = new URLSearchParams(searchParams);

  // Construct new URL state
  if (query) params.set("query", query);
  else params.delete("query");

  // Update URL without full page reload, triggering Server Component data fetch
  replace(`${pathname}?${params.toString()}`);
};
```

This guarantees that the Client Component always reflects the source-of-truth URL, while delegating the actual data fetching securely to the Server Component.

---

## [Entry 10] Next.js 15 `searchParams` Asynchronous API Breaking Change

### 1. Issue & Error Signature

Despite the URL correctly updating via the `SearchFilters` client component (e.g., `?query=capacitor`), the Server Component silently ignored all parameters, consistently returning an unfiltered Prisma dataset.

### 2. Root Cause & Architectural Context

Next.js 15 introduced a fundamental breaking change where dynamic APIs (like `searchParams` and `params`) transitioned from synchronous objects to asynchronous Promises. Treating `searchParams` as a synchronous object evaluates properties like `.query` as `undefined` at runtime, causing the Prisma `where` clause to fall back to empty strings and bypass all filtering logic.

### 3. Resolution & Implementation

Refactored the Server Component interface to explicitly type `searchParams` as a `Promise` and strictly `await` the resolution before destructuring the query arguments:

```typescript
export default async function PartsCataloguePage({
  searchParams,
}: {
  // 1. Explicitly type as a Promise to satisfy Next.js 15 runtime
  searchParams: Promise<{ query?: string; category?: string }>;
}) {
  // 2. Await the dynamic API before extraction
  const params = await searchParams;

  const query = params?.query || "";
  const category = params?.category || "";

  // 3. Pass resolved strings to the Prisma data layer
  const parts = await getParts(query, category);
```

---

## [Entry 11] Stale Server Component Caching on Distinct Database Queries

### 1. Issue & Error Signature

After implementing a dynamic Prisma query to fetch unique product categories (`getUniqueCategories`), the front-end dropdown rendered completely empty despite the database successfully seeding with components categorized as `"Connectors"` and `"ICs"`.

### 2. Root Cause & Architectural Context

Next.js aggressively caches Server Components and data fetches during the build process or initial render to optimize edge delivery. Because `PartsCataloguePage` did not initially contain dynamic runtime functions (before `searchParams` were properly awaited), the framework statically generated the route. The `getUniqueCategories` Prisma query fired once when the database was empty, cached the resulting empty array `[]`, and refused to re-query the PostgreSQL instance on subsequent navigations.

### 3. Resolution & Implementation

Enforced a strict dynamic rendering strategy at the route level. By exporting the `force-dynamic` configuration constant, Next.js is instructed to bypass the Route Cache and execute the Prisma queries directly against the database on every request:

```typescript
import { getParts, getUniqueCategories } from "@/app/actions/parts";
import SearchFilters from "./SearchFilters";

// Opt out of static generation; enforce request-time execution
export const dynamic = "force-dynamic";

export default async function PartsCataloguePage({ ... }) {
  // Concurrently fetch grid data and distinct dropdown categories
  const [parts, categories] = await Promise.all([
    getParts(query, category),
    getUniqueCategories(),
  ]);

  // ...
}
```

Coupled with Prisma's `distinct: ['category']` API, this ensures the filter dropdown immediately reflects newly seeded product categories without requiring manual cache invalidation or server restarts.

---

## [Entry 12] Pricing Model Logic Correction (Cost-Plus vs. Gross Margin)

### 1. Issue & Error Signature

During verification testing of the quotation totals, the calculated margin values were mathematically incorrect based on B2B distribution standards. For a part costing `$100` sold at `$125`, the initial system reported a `25%` margin instead of the true `20%` gross margin, violating the assignment's business logic requirements.

### 2. Root Cause & Architectural Context

An initial AI-assisted code generation of the pricing module (`src/lib/pricing.ts`) implemented the standard **markup** formula (`(Sell - Cost) / Cost`) instead of the required enterprise **gross margin** formula (`(Sell - Cost) / Sell`). Blindly trusting the generated snippet created a fundamental accounting error that would misrepresent profitability across all quotations.

### 3. Resolution & Implementation

Caught the discrepancy against the technical specifications, rejected the AI-generated snippet, and manually rewrote the financial calculation pipeline. Enforced strict arithmetic formulas tailored to true gross margin and implemented a zero-clamping mechanism to prevent negative margins from propagating into the UI:

```typescript
// Corrected Gross Margin Formula
const calculateMargin = (unitCost: number, unitSellPrice: number) => {
  if (unitSellPrice <= 0) return 0;
  return Math.max(0, ((unitSellPrice - unitCost) / unitSellPrice) * 100);
};
```

---

## [Entry 13] Live API Rate-Limiting & Timeout Handlers (Mouser Electronics)

### 1. Issue & Error Signature

During execution of the live database seeding script to fulfill the multi-category requirement, the process crashed midway with an `AxiosError: Request failed with status code 429` (Too Many Requests) and intermittent `ETIMEDOUT` errors.

### 2. Root Cause & Architectural Context

The initial seeding script dispatched external requests to the Mouser API concurrently using `Promise.all()`. The third-party distributor API enforces strict rate limits and concurrent connection ceilings, which the aggressive parallel ingestion violated, leading to IP-level blocking and socket timeouts.

### 3. Resolution & Implementation

Refactored the network ingestion layer away from concurrent arrays and into a sequential `for...of` loop with a synthetic delay (`setTimeout`) between live requests. Additionally, finalized the offline-first filesystem cache (`.cache/mouser/`) to intercept repeated queries, ensuring that subsequent seed runs bypass the network entirely:

```typescript
// Sequential delay implementation for rate-limit safety
for (const partNum of partNumbers) {
  await fetchFromMouser(partNum);
  await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay
}
```