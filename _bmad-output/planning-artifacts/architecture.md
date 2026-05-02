---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/product-brief-meni.md'
  - '_bmad-output/planning-artifacts/product-brief-meni-distillate.md'
workflowType: 'architecture'
project_name: 'Casa Meni'
user_name: 'Nivbi'
date: '2026-05-02'
status: 'complete'
completedAt: '2026-05-02'
---

# Architecture Decision Document — Casa Meni

_This document defines the technical architecture, implementation patterns, and project structure for the Casa Meni property management platform._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
76 FRs across 12 capability areas. Architecturally significant groups:
- **Financial Engine** (FR6–FR15): Double-entry accounting, bank feed integration (Plaid), AI categorization, multi-entity/LLC, payment processing (Stripe). Requires transactional integrity, audit trails, and precise decimal handling.
- **Multi-Role Access** (FR21–FR32, FR33–FR41, FR42–FR47, FR48–FR56, FR70–FR73): 10 distinct roles with different data scopes and UI experiences. Requires row-level security and role-based API authorization.
- **Real-Time Operations** (FR16–FR20, FR36): Dashboards with live metrics, work order status updates, notification delivery. Requires WebSocket or SSE infrastructure.
- **Offline Capability** (FR41): Field operations (maintenance, inspection) must work without connectivity. Requires local data storage with sync/conflict resolution.
- **Third-Party Integrations** (FR6, FR13, FR48, FR53): Plaid (banking), Stripe (payments), Airbnb/Vrbo/Booking.com (channels), smart locks. Requires adapter pattern with circuit breakers.

**Non-Functional Requirements:**
30 NFRs driving architecture: 99.9% uptime, <2s page loads, <500ms search, AES-256 encryption, TLS 1.3, row-level security, WCAG 2.1 AA, horizontal scaling to 10K+ operators, offline sync for mobile.

**Scale & Complexity:**

- Primary domain: PropTech SaaS (multi-tenant B2B)
- Complexity level: High
- Estimated architectural components: 14 core modules

### Technical Constraints & Dependencies

- Payment processing must be PCI DSS compliant → Stripe handles card data; application never touches raw card numbers.
- Bank feed aggregation → Plaid dependency; must handle rate limits and institution-specific quirks.
- Multi-tenant data isolation → Row-level security at database layer; no application-layer-only enforcement.
- Offline-first field operations → Service worker + IndexedDB for mobile; conflict resolution strategy required.
- Financial accuracy → Decimal precision (no floating point); all monetary amounts in cents (integer).

### Cross-Cutting Concerns Identified

- **Authentication & Authorization:** Every request must be scoped to tenant + role. Permeates all modules.
- **Audit Logging:** Financial transactions and sensitive operations require immutable audit trails.
- **Multi-Tenancy:** Tenant isolation affects database queries, file storage, API responses, and caching.
- **Notification System:** Events across all modules trigger notifications via push, email, SMS, and in-app.
- **File Management:** Photos (maintenance, inspections, renovations, listings) need upload, storage, CDN delivery, and property-level organization.

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack TypeScript web application with API-first architecture, targeting web and mobile (PWA initially, React Native in Phase 3).

### Starter Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **Next.js + tRPC + Prisma (T3 Stack)** | Full TypeScript, type-safe API, great DX, huge ecosystem | tRPC less suited for public API consumers; tight coupling |
| **Next.js + NestJS + Prisma** | Separation of concerns, NestJS built for enterprise patterns (DI, modules, guards), OpenAPI generation | Two frameworks to maintain; more boilerplate |
| **Remix + Hono + Drizzle** | Modern, fast, edge-ready | Smaller ecosystem; less enterprise-grade auth/middleware patterns |

### Selected Starter: Next.js (App Router) + NestJS API + Prisma ORM + PostgreSQL

**Rationale for Selection:**
- **Next.js App Router** provides server components, server actions, and optimized rendering for the dashboard-heavy UI. React Server Components reduce client bundle size for data-heavy views (P&L, analytics).
- **NestJS** provides enterprise-grade backend patterns: dependency injection, guards (RBAC), interceptors (audit logging), modules (clean separation of 14 capability areas). OpenAPI generation for future public API and mobile client.
- **Prisma ORM** provides type-safe database access, migrations, and excellent PostgreSQL support including RLS.
- **PostgreSQL** provides row-level security, JSONB for flexible schemas, excellent financial data handling, and proven scalability.

**Initialization Command:**

```bash
npx create-next-app@latest casa-meni-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npx @nestjs/cli new casa-meni-api --strict --package-manager npm
npx prisma init --datasource-provider postgresql
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript 5.x across entire stack. Node.js 20 LTS. Strict mode enabled.

**Styling Solution:**
Tailwind CSS 4.x + shadcn/ui component library. Consistent design tokens. Dark mode support.

**Build Tooling:**
Next.js (Turbopack for dev), NestJS (SWC compiler), ESLint + Prettier, Husky pre-commit hooks.

**Testing Framework:**
Vitest for unit/integration tests. Playwright for E2E. Supertest for API testing. >80% coverage target for business logic.

**Code Organization:**
Monorepo with shared TypeScript types between frontend and backend. Turborepo for workspace management.

**Development Experience:**
Hot reload on both frontend and API. Docker Compose for local PostgreSQL + Redis. Seed scripts for development data.

**Note:** Project initialization using these commands should be the first implementation story.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Multi-tenant data architecture (RLS vs schema-per-tenant)
2. Authentication and authorization system
3. Database schema for financial engine (double-entry accounting)
4. API architecture pattern (REST + WebSocket)
5. Payment processing integration approach

**Important Decisions (Shape Architecture):**
6. Caching strategy
7. Background job processing
8. File storage architecture
9. Notification delivery system
10. Search infrastructure

**Deferred Decisions (Post-MVP):**
- Channel management API integration (Phase 2)
- Mobile native framework (Phase 3)
- IoT sensor data ingestion (Phase 3)
- ML pipeline for deal scoring (Phase 3)

### Data Architecture

**Database:** PostgreSQL 16
**ORM:** Prisma 6.x
**Multi-Tenancy Strategy:** Row-Level Security (RLS)

Every table includes a `tenant_id` column. PostgreSQL RLS policies enforce that queries only return rows matching the authenticated tenant. This is enforced at the database level — even a bug in application code cannot leak data across tenants.

**Financial Data Model:** Double-entry accounting. Every financial transaction creates two entries (debit + credit). All monetary values stored as integers in cents (no floating point). Ledger entries are append-only (immutable). Corrections create new reversing entries.

**Key Tables (simplified):**
- `tenants` — operator organizations
- `users` — all users across all roles, linked to tenant
- `properties` — the core entity, linked to tenant + entity
- `units` — within properties
- `leases` — links tenant-user to unit with terms
- `transactions` — financial ledger (double-entry)
- `accounts` — chart of accounts per entity
- `work_orders` — maintenance tickets
- `invoices` — vendor invoices
- `distributions` — investor payouts
- `documents` — file metadata linked to any entity
- `audit_log` — immutable event log

**Rationale:** RLS at DB level provides defense-in-depth for multi-tenancy. Integer cents prevent rounding errors. Append-only ledger ensures audit compliance. Prisma provides type-safe access with migration management.

### Authentication & Security

**Auth Provider:** NextAuth.js v5 (Auth.js) for web; JWT tokens for API.
**MFA:** TOTP-based (Google Authenticator compatible). Optional for MVP, required for owner/admin role in Phase 2.
**Session:** JWT with 15-minute access token, 7-day refresh token. Stored in httpOnly cookies for web.
**Authorization:** NestJS Guards implementing RBAC. Each endpoint declares required role(s). Tenant scoping injected via middleware.

```
Request → Auth Middleware (verify JWT) → Tenant Scoping (set tenant_id) → Role Guard (check RBAC) → Controller → Service → Prisma (RLS enforced)
```

**Rationale:** Defense-in-depth — authorization enforced at route level (NestJS Guard), service level (tenant scoping), and database level (RLS). JWT enables stateless API authentication for future mobile clients.

### API & Communication Patterns

**Primary API:** REST (JSON) via NestJS controllers. OpenAPI 3.0 auto-generated via `@nestjs/swagger`.
**Real-Time:** WebSocket via Socket.io (NestJS WebSocket gateway). Used for: dashboard live updates, work order status changes, chat messages, notifications.
**Background Jobs:** BullMQ (Redis-backed). Used for: bank feed sync, report generation, email delivery, scheduled alerts, notification fan-out.

**API Versioning:** URL-based (`/api/v1/...`). Breaking changes require new version; old version supported for 6 months.

**Rationale:** REST for broad compatibility (web, mobile, third-party). WebSocket for real-time UX on dashboards. BullMQ provides reliable job processing with retry, scheduling, and rate limiting — critical for bank sync and payment processing.

### Frontend Architecture

**Framework:** Next.js 15 (App Router) with React Server Components.
**State Management:** TanStack Query (React Query) for server state. Zustand for client state (minimal — auth context, UI preferences).
**UI Library:** shadcn/ui + Tailwind CSS. Radix UI primitives for accessibility.
**Forms:** React Hook Form + Zod validation (shared schemas with backend).
**Charts/Data Viz:** Recharts for dashboard charts and P&L visualizations.

**Rendering Strategy:**
- Dashboard pages: Server Components with streaming (fast initial load, live data via WebSocket).
- Forms/interactive: Client Components.
- Public pages (marketing, login): Static generation.

**Rationale:** Server Components reduce JavaScript shipped to client — critical for data-heavy dashboards. TanStack Query handles caching, invalidation, and optimistic updates. shadcn/ui provides accessible, customizable components without a heavy library.

### Infrastructure & Deployment

**Hosting:** Vercel (Next.js frontend) + Railway or Fly.io (NestJS API + workers).
**Database:** Neon PostgreSQL (serverless, auto-scaling, branching for dev).
**Cache/Queue:** Upstash Redis (serverless, BullMQ compatible).
**File Storage:** AWS S3 + CloudFront CDN.
**Email:** Resend (transactional email).
**Monitoring:** Sentry (error tracking) + Axiom (logging) + Better Uptime (status).

**CI/CD:** GitHub Actions. Automated tests on PR. Preview deployments on Vercel. Production deploys on merge to `main`.

**Environments:** `development` (local Docker) → `staging` (preview on PR) → `production` (merge to main).

**Rationale:** Serverless-first reduces ops burden for a small team. Neon PostgreSQL supports branching (each PR gets its own DB). Vercel handles frontend CDN/edge automatically. Railway provides simple container deployment for NestJS.

### Decision Impact Analysis

**Implementation Sequence:**
1. PostgreSQL schema + RLS policies + Prisma setup
2. NestJS auth module (JWT + RBAC guards)
3. Core API: properties, units, users CRUD
4. Next.js dashboard shell with auth
5. Financial engine (accounts, transactions, bank feed via Plaid)
6. Tenant portal (rent payment via Stripe, maintenance requests)
7. Maintenance work order system
8. Investor portal (read-only)
9. Notifications + alerts engine
10. Reporting module

**Cross-Component Dependencies:**
- Auth/tenant scoping → used by ALL other modules
- Financial engine → used by dashboard, investor portal, reporting
- Notification engine → triggered by maintenance, payments, alerts
- File upload → used by maintenance, inspections, renovations, properties

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 12 areas where AI agents could make different choices.

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural (`properties`, `work_orders`, `lease_payments`)
- Columns: `snake_case` (`tenant_id`, `created_at`, `unit_price_cents`)
- Indexes: `idx_{table}_{columns}` (`idx_properties_tenant_id`)
- Foreign keys: `fk_{table}_{referenced_table}` (`fk_units_property_id`)
- Monetary columns: suffix `_cents` (integer, never float)
- Timestamp columns: `created_at`, `updated_at` (auto-managed by Prisma)

**API Naming Conventions:**
- Endpoints: `/api/v1/{resource}` — plural, kebab-case (`/api/v1/work-orders`)
- Query params: `camelCase` (`?pageSize=20&sortBy=createdAt`)
- Request/response body: `camelCase` JSON
- HTTP methods: GET (read), POST (create), PATCH (partial update), DELETE (remove)

**Code Naming Conventions:**
- Files: `kebab-case.ts` (`work-order.service.ts`, `create-property.dto.ts`)
- Classes: `PascalCase` (`WorkOrderService`, `CreatePropertyDto`)
- Functions/methods: `camelCase` (`getPropertyById`, `calculateMonthlyPnl`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_UPLOAD_SIZE_MB`, `DEFAULT_PAGE_SIZE`)
- Types/interfaces: `PascalCase`, no `I` prefix (`Property`, `WorkOrder`, not `IProperty`)
- Enums: `PascalCase` name, `UPPER_SNAKE_CASE` values (`enum Role { OWNER, TENANT, MAINTENANCE_TECH }`)

### Structure Patterns

**Project Organization:**
NestJS modules map 1:1 to capability areas. Each module is self-contained with its own controllers, services, DTOs, and entities.

**File Structure Patterns:**
```
src/modules/{module-name}/
  {module-name}.module.ts
  {module-name}.controller.ts
  {module-name}.service.ts
  dto/
    create-{entity}.dto.ts
    update-{entity}.dto.ts
  entities/
    {entity}.entity.ts
  guards/                    (if module-specific)
  __tests__/
    {module-name}.service.spec.ts
    {module-name}.controller.spec.ts
```

### Format Patterns

**API Response Formats:**

Success (single):
```json
{
  "data": { ... },
  "meta": { "requestId": "uuid" }
}
```

Success (list):
```json
{
  "data": [ ... ],
  "meta": {
    "total": 142,
    "page": 1,
    "pageSize": 20,
    "requestId": "uuid"
  }
}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [ { "field": "email", "message": "Invalid email format" } ]
  },
  "meta": { "requestId": "uuid" }
}
```

**Data Exchange Formats:**
- Dates: ISO 8601 (`2026-05-02T01:30:00Z`) — always UTC in API; display timezone in frontend.
- Money: Integer cents in API and database. Frontend formats for display (`$1,234.56`).
- IDs: UUIDs (v7 for sortability) as strings.
- Booleans: `true`/`false` (never `0`/`1`).
- Nulls: Explicit `null` for absent values (never omit field).

### Communication Patterns

**Event System Patterns:**
- Event names: `{entity}.{action}` in past tense (`work_order.created`, `payment.received`, `lease.expiring`)
- Events published to BullMQ queue. Consumers are NestJS event handlers.
- Every event includes: `tenantId`, `entityId`, `entityType`, `action`, `timestamp`, `actorId`.

**State Management Patterns (Frontend):**
- Server state via TanStack Query. Cache keys: `[resource, id?, filters?]` (`['properties', '123']`, `['work-orders', { status: 'open' }]`).
- Mutations invalidate related queries via `queryClient.invalidateQueries`.
- Optimistic updates for user-facing actions (mark work order complete, send message).
- WebSocket events trigger query invalidation for real-time updates.

### Process Patterns

**Error Handling Patterns:**
- API: NestJS exception filters catch all errors. Return consistent error format (above). Log with request context.
- Services: Throw typed exceptions (`NotFoundException`, `ForbiddenException`, `ConflictException`).
- Frontend: TanStack Query `onError` callbacks. Toast notifications for user-facing errors. Error boundaries for component crashes.
- Background jobs: BullMQ retry with exponential backoff (3 attempts). Dead letter queue for failed jobs. Alert on DLQ threshold.

**Loading State Patterns:**
- Skeleton loaders for initial page loads (never spinners on full pages).
- Inline spinners for actions (button loading state).
- Optimistic UI for mutations (show success immediately, rollback on error).
- Streaming for dashboard metrics (show partial data as it loads).

### Enforcement Guidelines

**All AI Agents MUST:**

- Use the naming conventions defined above for all code, database, and API artifacts.
- Follow the module structure pattern for all new features.
- Return the standard API response format for all endpoints.
- Store all monetary values as integer cents.
- Include `tenantId` scoping in every database query (enforced by RLS + middleware).
- Write tests for all service-layer business logic.

**Pattern Enforcement:**

- ESLint rules enforce naming conventions and import patterns.
- Prisma schema validation enforces database naming.
- API integration tests verify response format compliance.
- PR review checklist includes pattern adherence.

### Pattern Examples

**Good Examples:**
```typescript
// Service method — clear naming, tenant-scoped, typed return
async getPropertyById(tenantId: string, propertyId: string): Promise<Property> {
  const property = await this.prisma.property.findFirst({
    where: { id: propertyId, tenantId },
  });
  if (!property) throw new NotFoundException('Property not found');
  return property;
}
```

**Anti-Patterns:**
```typescript
// BAD: No tenant scoping, vague naming, floating-point money
async get(id: any) {
  return this.prisma.property.findUnique({ where: { id } }); // Missing tenantId!
}
const rent = 1234.56; // BAD: Use 123456 (cents)
```

---

## Project Structure & Boundaries

```
casa-meni/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/           # Login, register, forgot password
│   │   │   │   ├── (dashboard)/      # Owner/admin dashboard
│   │   │   │   │   ├── properties/
│   │   │   │   │   ├── financials/
│   │   │   │   │   ├── maintenance/
│   │   │   │   │   ├── tenants/
│   │   │   │   │   ├── investors/
│   │   │   │   │   └── settings/
│   │   │   │   ├── (tenant)/         # Tenant portal
│   │   │   │   │   ├── payments/
│   │   │   │   │   ├── maintenance/
│   │   │   │   │   └── documents/
│   │   │   │   ├── (maintenance)/    # Maintenance tech view
│   │   │   │   │   ├── work-orders/
│   │   │   │   │   └── time-log/
│   │   │   │   ├── (investor)/       # Investor portal
│   │   │   │   │   ├── returns/
│   │   │   │   │   ├── distributions/
│   │   │   │   │   └── documents/
│   │   │   │   └── (vendor)/         # Vendor portal
│   │   │   │       ├── jobs/
│   │   │   │       └── invoices/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   ├── dashboard/        # Dashboard-specific
│   │   │   │   ├── forms/            # Shared form components
│   │   │   │   ├── charts/           # Chart components
│   │   │   │   └── layout/           # Navigation, sidebar, headers
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # API client (fetch wrapper)
│   │   │   │   ├── auth.ts           # Auth utilities
│   │   │   │   ├── format.ts         # Money, date, number formatters
│   │   │   │   └── hooks/            # Custom React hooks
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── api/                          # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/             # Authentication & authorization
│       │   │   ├── tenants/          # Tenant (org) management
│       │   │   ├── users/            # User management (all roles)
│       │   │   ├── properties/       # Property & unit CRUD
│       │   │   ├── leases/           # Lease management
│       │   │   ├── financial/        # Accounting engine, P&L, bank feed
│       │   │   ├── payments/         # Stripe rent collection
│       │   │   ├── maintenance/      # Work orders, scheduling
│       │   │   ├── investors/        # Investor portal, distributions
│       │   │   ├── vendors/          # Vendor jobs, invoices, scoring
│       │   │   ├── documents/        # File upload, storage, vault
│       │   │   ├── notifications/    # Push, email, SMS, in-app
│       │   │   ├── reports/          # Report generation
│       │   │   └── alerts/           # Smart alert engine, escalation
│       │   ├── common/
│       │   │   ├── guards/           # RBAC guards, tenant guard
│       │   │   ├── interceptors/     # Audit log, response format
│       │   │   ├── filters/          # Exception filters
│       │   │   ├── decorators/       # @CurrentUser, @TenantId, @Roles
│       │   │   ├── pipes/            # Validation pipes
│       │   │   └── middleware/       # Tenant scoping middleware
│       │   ├── prisma/
│       │   │   ├── schema.prisma
│       │   │   ├── migrations/
│       │   │   └── seed.ts
│       │   ├── jobs/                 # BullMQ job processors
│       │   │   ├── bank-sync.job.ts
│       │   │   ├── notifications.job.ts
│       │   │   ├── reports.job.ts
│       │   │   └── alerts.job.ts
│       │   └── main.ts
│       ├── test/
│       │   ├── e2e/
│       │   └── fixtures/
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared TypeScript types & schemas
│       ├── src/
│       │   ├── types/                # Shared interfaces (Property, User, etc.)
│       │   ├── schemas/              # Zod validation schemas
│       │   ├── constants/            # Shared constants (roles, statuses)
│       │   └── utils/                # Shared utilities (money formatting)
│       └── package.json
│
├── docker-compose.yml                # Local dev: PostgreSQL + Redis
├── turbo.json                        # Turborepo config
├── package.json                      # Root workspace
├── .env.example
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Test + lint on PR
│       └── deploy.yml                # Deploy on merge to main
└── README.md
```

### Architectural Boundaries

**API Boundaries:**
- All frontend-to-backend communication goes through REST API (`/api/v1/...`).
- WebSocket connection (`/ws`) for real-time updates only — never for data mutations.
- No direct database access from frontend. No server-side rendering with direct DB calls (data goes through API).

**Component Boundaries:**
- Each NestJS module owns its domain. Modules communicate via injected services, never via direct database queries across module boundaries.
- `financial` module owns all accounting logic. Other modules (maintenance, payments) emit events; financial module processes them.
- `notifications` module is event-driven. Other modules publish events; notifications module handles delivery.

**Service Boundaries:**
- Plaid integration isolated in `financial/plaid.adapter.ts`. All other code uses `BankFeedService` — never Plaid SDK directly.
- Stripe integration isolated in `payments/stripe.adapter.ts`. All other code uses `PaymentService`.
- Future integrations (Airbnb, smart locks) follow same adapter pattern.

**Data Boundaries:**
- Every Prisma query must include `tenantId` in the `where` clause (enforced by RLS and validated in code review).
- Investor role can only read financial data for properties they are invested in (additional RLS policy).
- Tenant role can only access their own unit, lease, and payment data.
- File uploads are stored under `s3://{bucket}/{tenantId}/{propertyId}/{entityType}/{filename}`. Tenant ID in the path provides defense-in-depth.

### Requirements to Structure Mapping

**Feature Mapping:**

| PRD Capability | Frontend Route Group | Backend Module |
|----------------|---------------------|----------------|
| Property Management (FR1–5) | `(dashboard)/properties` | `properties` |
| Financial Engine (FR6–15) | `(dashboard)/financials` | `financial`, `payments` |
| Dashboard & Alerts (FR16–20) | `(dashboard)/` | `reports`, `alerts` |
| Tenant Portal (FR21–32) | `(tenant)/*` | `leases`, `payments`, `maintenance` |
| Maintenance Ops (FR33–41) | `(maintenance)/*`, `(dashboard)/maintenance` | `maintenance` |
| Investor Portal (FR42–47) | `(investor)/*` | `investors` |
| Vendor Management (FR70–73) | `(vendor)/*` | `vendors` |
| Communication (FR74–76) | Shared components | `notifications` |

### Integration Points

**Internal Communication:**
- Frontend → API: REST (TanStack Query) + WebSocket (Socket.io)
- API modules → Financial: Service injection + event publishing
- API → Jobs: BullMQ queue publishing
- Jobs → API: Job processors call services; emit events on completion

**External Integrations:**

| Service | Module | Purpose | Adapter File |
|---------|--------|---------|-------------|
| Plaid | financial | Bank feed aggregation | `plaid.adapter.ts` |
| Stripe | payments | Rent collection, vendor payouts | `stripe.adapter.ts` |
| Resend | notifications | Transactional email | `email.adapter.ts` |
| AWS S3 | documents | File storage | `storage.adapter.ts` |

**Data Flow:**
```
User Action → Next.js → REST API → NestJS Controller → Service → Prisma → PostgreSQL (RLS)
                                                      ↓
                                               BullMQ Job Queue → Job Processor → Service
                                                      ↓
                                               WebSocket → Frontend (real-time update)
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are proven together: Next.js + NestJS + Prisma + PostgreSQL is a well-established stack with active ecosystem support. TypeScript end-to-end eliminates type mismatches. Prisma generates types that flow through to API responses and frontend consumption via shared package.

**Pattern Consistency:**
Naming conventions are consistent across layers (snake_case DB → camelCase API/code). Module structure enforced at NestJS framework level. API response format standardized via interceptor.

**Structure Alignment:**
Project structure maps directly to PRD capability areas. Each functional requirement has a clear home in exactly one module. No orphaned requirements.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
All 76 FRs mapped to specific modules. MVP FRs (FR1–FR47, FR70–FR76) fully supported by Phase 1 architecture. Phase 2 FRs (FR48–FR69) supported by adapter pattern — integration modules added without touching core architecture.

**Non-Functional Requirements Coverage:**
- Performance (NFR1–5): Server Components + streaming for fast loads; Redis caching; PostgreSQL indexing strategy.
- Security (NFR6–13): Encryption, RLS, RBAC guards, Stripe PCI delegation, audit logging via interceptor.
- Scalability (NFR14–17): Stateless API (horizontal scaling), serverless PostgreSQL (Neon), S3 for files, BullMQ for background jobs.
- Accessibility (NFR18–20): shadcn/ui built on Radix (WCAG 2.1 AA compliant primitives).
- Integration (NFR21–26): OpenAPI spec, webhook support, Plaid/Stripe adapters, CSV/PDF export.
- Reliability (NFR27–30): Multi-region deployment option, automated backups, circuit breakers on external services, offline sync.

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical and important decisions documented with specific versions and rationale.
**Structure Completeness:** Full project tree with every directory justified and mapped to requirements.
**Pattern Completeness:** All naming, structure, format, communication, and process patterns defined with examples.

### Gap Analysis Results

| Gap | Priority | Status |
|-----|----------|--------|
| Prisma schema not yet written | High | Addressed in first implementation story |
| Offline sync conflict resolution strategy | Medium | Deferred to Phase 2 (mobile PWA enhancement) |
| Channel manager API contract (Airbnb/Vrbo) | Low | Phase 2 — adapter interface defined, implementation deferred |
| ML pipeline for deal scoring | Low | Phase 3 — not architecturally relevant until data exists |

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- TypeScript end-to-end eliminates type drift between frontend and backend
- Row-level security provides defense-in-depth for multi-tenancy
- Module-per-capability structure makes it easy for AI agents to work on features independently
- Adapter pattern for all external services ensures Phase 2/3 integrations don't require re-architecture

**Areas for Future Enhancement:**
- Event sourcing for financial ledger (currently append-only rows; could evolve to full event sourcing)
- GraphQL API layer for mobile clients with selective field loading
- Edge computing for real-time dashboard metrics (currently server-rendered)

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Every database query must include tenant scoping
- All monetary values in integer cents — no exceptions
- New modules follow the exact module structure pattern
- All external service calls go through adapter files

**First Implementation Priority:**
1. Initialize monorepo with Turborepo + workspace configuration
2. Set up PostgreSQL schema with Prisma (core tables + RLS policies)
3. NestJS auth module (JWT + tenant scoping + RBAC guards)
4. Next.js auth pages (login, register) + dashboard shell
5. Properties CRUD (first full vertical slice through the stack)

---

*End of Architecture Document — Casa Meni v1.0*
