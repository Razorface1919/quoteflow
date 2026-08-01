# QuoteFlow — B2B Quotation Management System

QuoteFlow is a robust, full-stack B2B quotation and inventory management system designed for enterprise sales workflows. It features an automated 12-state approval lifecycle, strict Role-Based Access Control (RBAC), offline-first third-party catalog ingestion, and immutable quotation versioning.

---

## 1. Stack Rationale

| Technology | Rationale |
|---|---|
| **Next.js (App Router)** | Unified Server Components and Server Actions architecture allows complex database mutations (like atomic quote revisions) to be handled securely on the server without exposing intermediate REST APIs, while leveraging React for highly interactive client-side data grids. |
| **Prisma 7 & `@prisma/adapter-pg`** | Modern Prisma architectures decouple query compilation from wire-protocol execution. Using the native PostgreSQL driver adapter (`pg.Pool`) ensures deterministic socket management, preventing connection exhaustion during development hot-reloads and large batch-seeding operations. |
| **PostgreSQL (Dockerized)** | Selected for its strict ACID compliance, which is mandatory for financial data and atomic transactional operations (e.g., archiving old quotes while simultaneously inserting new revisions). |
| **NextAuth.js (v5)** | Provides secure, session-based authentication locked strictly to the Node.js runtime to support standard cryptographic libraries (`bcryptjs`) safely. |

---

## 2. Known Limitations & Deviations

In the interest of engineering transparency, the following limitations and spec deviations are explicitly acknowledged:

**RBAC Expansion (Three-Tier vs. Two-Tier):** While the original specification outlined a two-tier RBAC system (`MANAGER` and `SALES`), a three-tier model (`ADMIN`, `MANAGER`, `SALES`) was implemented. The `ADMIN` role was introduced to safely isolate system-level configurations and critical data reset capabilities (such as database seeding and global user management) from day-to-day operational oversight. This ensures that Regional Managers have the exact permissions needed for quote approvals without violating the principle of least privilege by exposing application-wide destructive actions to standard management accounts.

**No Live FX Conversion:** Financial totals are currently calculated and stored statically in the base currency (USD). Real-time foreign exchange (FX) conversion APIs are not implemented in this build.

**Concurrency Handling:** The system currently lacks real-time optimistic concurrency control (e.g., WebSocket locks). If two authorized users attempt to edit the same draft quote at the exact same millisecond, the last write will win.

---

## 3. Prerequisites

- Node.js `v18.17.0` or higher
- Docker Desktop (running and active)
- `npm` or `pnpm`

---

## 4. Run Instructions (Fresh Clone Verification)

To guarantee a clean environment, follow these exact steps from a fresh repository clone.

**Step 1 — Clone the repository and install dependencies:**

```bash
git clone <your-repo-url>
cd quoteflow
npm install
```

**Step 2 — Configure the environment:**

Create a `.env` file in the root directory by copying the provided example:

```bash
cp .env.example .env
```

> **Note:** The local Docker database maps to host port `5433` to prevent collisions with ambient local PostgreSQL installations. Ensure your `DATABASE_URL` ends in `:5433/quoteflow`.

**Step 3 — Spin up the infrastructure and apply schemas:**

Start the PostgreSQL container and push the migration history to establish the relational schema:

```bash
docker compose up -d
npx prisma migrate dev
```

**Step 4 — Start the application:**

```bash
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

## 5. Database Seeding Instructions

The seeding pipeline handles both user generation and complex inventory/quote population. It uses an idempotent upsert strategy, meaning it is safe to run multiple times without corrupting data.

**Run the seed command:**

```bash
npx prisma db seed
```

Alternatively, using the TSX runner directly:

```bash
npx tsx --env-file=.env src/seed.ts
```

### Seeding Data Breakdown

**Categories (4+):** The script explicitly seeds components across Capacitors, Resistors, Integrated Circuits (ICs), and Connectors.

**Live API vs. Cached:**
The script executes live API fetches to Mouser Electronics for real catalog data. To prevent rate-limiting, responses are intercepted by a local filesystem cache (`.cache/mouser/`). Subsequent seed runs will hit the cache in under `10ms`.

**Demo Users:** Admin, Manager, and Sales accounts are generated via static deterministic datasets with securely hashed `bcrypt` passwords.

**Demo Customers:** A set of static customer records is seeded to support quote generation across all roles.

**Quote States (Full Coverage):** The seed script generates a robust set of demonstration quotes covering all 12 operational states. This explicitly includes pre-generated `REJECTED` and `EXPIRED` quotes to demonstrate edge-case UI handling upon first login.

---

## 6. Test Instructions

The testing suite utilizes Supertest to validate HTTP-level API routes and Server Action behaviors, ensuring genuine end-to-end (E2E) integration rather than isolated unit function calls.

**Run the test suite:**

```bash
npm run test
```

> **Note:** Ensure your Docker database is running before executing the test suite. These are true integration tests that execute live reads and writes against the test database instance.

---

## 7. Future Improvements

With more time, the architecture would be expanded in the following ways:

**Optimistic Concurrency Control (OCC):** Implement a version-token system or WebSockets (via Pusher) to lock quote records when a user begins editing, preventing simultaneous overwrite collisions across multiple concurrent sessions.

**Automated PDF Generation:** Integrate a headless browser microservice (Puppeteer / Playwright) to automatically generate and attach static, styled PDF documents when a quote reaches the `APPROVED` or `SENT` states.

**Live Currency Support:** Integrate a daily-updating caching layer for a Foreign Exchange API (such as Open Exchange Rates) to allow seamless toggling between USD, EUR, and GBP for international clients, while freezing the exchange rate at the time of quote creation.