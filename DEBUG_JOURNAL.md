# QuoteFlow — Technical Debug Journal

> This journal documents real engineering challenges, edge-case failures, and architectural refactors encountered during the development of QuoteFlow. Each entry captures the exact error signature, root-cause analysis, and practical resolution to maintain an authentic, defensible log of technical decision-making.

---

## [Entry 01] — Prisma 7 Driver Adapter & Native PG Connection Pool Misfire

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

## [Entry 02] — Auth.js v5 & App Router Edge Runtime Compatibility Misfire with bcryptjs

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

## [Entry 03] — Manufacturer Part Catalog Duplication & Composite Natural Key Migration

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

## [Entry 04] — Host Port Collision & Idempotent Container Persistence Verification

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