# QuoteFlow — Architecture & System Design

This document outlines the core structural patterns, data modeling decisions, and engineering trade-offs established for **QuoteFlow**. Every decision is grounded in auditability, data integrity, and deterministic execution.

---

## 1. System Context & Runtime Boundaries

### Next.js 14 (App Router) & Strict Node.js Runtime Enforcement
* **Decision:** We explicitly lock core backend route handlers—including authentication (`app/api/auth/[...nextauth]/route.ts`) and database mutations—to the **Node.js runtime** (`export const runtime = 'nodejs';`).
* **Rationale:** By default, modern Next.js build toolchains often push route handlers toward lightweight Edge isolates. However, our stack relies on native C++ bindings/buffers (`bcryptjs` for password hashing) and TCP wire-protocol database drivers (`pg`), which are incompatible with the Edge Runtime. Enforcing Node.js guarantees stable cryptographic execution and persistent database sockets.

---

## 2. Role-Based Access Control (RBAC) Governance

### Three-Role Model (`ADMIN` / `MANAGER` / `SALES`) Justification
> **Design Rationale:** We retain an explicit `ADMIN` role beyond the two-role operational spec (`MANAGER` / `SALES`) to strictly decouple system-level user provisioning, role assignments, and audit log governance from day-to-day quotation approval workflows.

* **Authentication vs. Authorization Separation:** Day 1 establishes secure **Session-Gating (Authentication)** via Auth.js v5 to verify identity (`if (!session?.user)`). Fine-grained **Role-Gating (Authorization)** is deliberately decoupled and enforced at the domain-action layer when handling quote approvals and price-override thresholds.

---

## 3. Database Layer & Connection Strategy

### Prisma 7 Driver Adapter & Native Postgres Pooling
* **Decision:** Database connectivity is routed through Prisma 7's `@prisma/adapter-pg` wrapper executing over a native `pg.Pool` instance (`src/lib/db.ts`).
* **Rationale:** Modern Prisma architectures decouple query compilation from wire-protocol execution. Managing a centralized native connection pool prevents connection exhaustion during Next.js Hot Module Replacement (HMR) in development and ensures deterministic socket management across automated CLI scripts (`seed.ts`).

---

## 4. Domain Modeling & Inventory Integrity

### B2B Component Deduplication via Composite Natural Keys
* **Decision:** The `Part` entity utilizes a **Composite Unique Natural Key** (`@@unique([manufacturer, manufacturerPartNum])`) alongside a surrogate UUID primary key (`id String @id @default(uuid())`).
* **Rationale:** 
  * **Surrogate UUID:** Serves as a stable foreign-key reference for downstream Bill of Materials (BOM) line items and quotation versions without exposing catalog strings in URLs.
  * **Composite Natural Key:** Electronic components are universally identified by their Manufacturer and Manufacturer Part Number (MPN). Relying solely on a UUID creates a race-condition vulnerability where concurrent distributor API ingestions (e.g., Mouser vs. Digi-Key) could insert duplicate rows for the same physical part. The composite constraint enforces database-level idempotency.

---

## 5. External Integration & Development Resiliency

### Offline-First Disk-Caching for Third-Party APIs (Mouser Electronics)
* **Decision:** All external catalog queries (`src/lib/mouser.ts`) pass through a cache-first filesystem interception layer stored in `.cache/mouser/` before dispatching live outbound HTTP requests.
* **Rationale:** Direct dependency on live distributor APIs during development introduces rate-limiting bottlenecks, latency, and network fragility. Caching JSON responses locally allows automated seeding (`npm run seed`), UI testing, and CI/CD pipelines to execute in `<10ms` offline while keeping `.cache/` excluded from version control (`.gitignore`).

---

## 6. Local Infrastructure & Idempotent Pipelines

### Isolated Docker Storage & Upsert Seeding
* **Decision:** Local development databases run via Docker Compose mapped to host port **`5433:5432`**, with database seeding executed via `tsx --env-file=.env src/seed.ts`.
* **Rationale:** Shifting the host port to `5433` prevents socket binding collisions with ambient system PostgreSQL installations. The automated seeding script leverages Prisma `upsert` queries targeting the compound unique index, ensuring that container restarts (`docker compose down && up -d`) and repetitive seed commands remain 100% idempotent without data loss or constraint crashes.