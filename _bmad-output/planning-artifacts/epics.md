---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

# Casa Meni — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Casa Meni, transforming the PRD (76 FRs, 30 NFRs) and Architecture decisions into implementable stories organized by user value. Each story includes acceptance criteria in Given/When/Then format for the Developer agent.

## Requirements Inventory

### Functional Requirements

FR1: Owner can create, edit, and archive properties with address, type, photos, documents, and unit details.
FR2: Owner can create and manage units within multi-unit properties with individual lease tracking.
FR3: Owner can assign properties to entities/LLCs for financial separation.
FR4: Owner can view all properties on a map with color-coded status indicators.
FR5: System maintains a knowledge base per property.
FR6: System connects to bank accounts via Plaid and auto-imports transactions daily.
FR7: System suggests transaction categories using AI based on vendor name, amount, and historical patterns.
FR8: Owner can manually categorize, split, or reassign transactions to properties.
FR9: System generates real-time P&L per property, per entity, and across the portfolio.
FR10: System supports double-entry chart of accounts pre-configured for real estate.
FR11: System tracks security deposits in compliant trust accounts with reconciliation.
FR12: System auto-generates 1099 forms for vendors/contractors paid over $600.
FR13: System supports multiple payment methods for rent collection: ACH, credit/debit card, and digital wallets.
FR14: System calculates and applies late fees per jurisdiction-specific rules.
FR15: System splits mortgage payments between principal and interest automatically.
FR16: Owner sees a command center dashboard showing portfolio health metrics.
FR17: System generates a prioritized daily action feed based on urgency and business impact.
FR18: Owner can configure alert rules with escalation chains.
FR19: System calculates and displays vacancy loss per unit in real-time.
FR20: Owner can compare properties side-by-side on any metric.
FR21: Tenant can pay rent via ACH, credit/debit card, or digital wallet with one tap.
FR22: Tenant can enable auto-pay with configurable payment date.
FR23: Tenant can split rent payments with roommates.
FR24: Tenant can submit maintenance requests with photos, video, urgency level, and description.
FR25: Tenant can track maintenance request status in real-time.
FR26: Tenant can rate completed maintenance jobs.
FR27: Tenant can view current lease, addenda, move-in inspection photos, and all related documents.
FR28: Tenant can e-sign lease renewals and addenda.
FR29: Tenant can message property manager with read receipts and file attachments.
FR30: Tenant can trigger emergency escalation that bypasses normal communication queue.
FR31: Tenant can view payment history and download receipts.
FR32: Tenant can request a payment plan for financial hardship situations.
FR33: System creates work orders from tenant requests, inspections, cleaning damage reports, and manual creation.
FR34: Owner/PM can assign work orders to internal technicians or external vendors.
FR35: Work orders display property, unit, issue description, tenant photos, access instructions, asset history, priority level.
FR36: Technician can update work order status, add notes, and upload before/after photos with GPS and timestamp metadata.
FR37: Technician can log time per work order with separate travel and work time tracking.
FR38: Technician can scan barcodes/receipts to log parts expenses to the correct property.
FR39: System supports preventive maintenance schedules.
FR40: System tracks assets per unit with warranty dates and service history.
FR41: System works offline for field operations and syncs when connectivity is restored.
FR42: Investor can view total invested, current value, IRR, cash-on-cash, equity multiple, and distribution history.
FR43: Investor can see full P&L for properties they are invested in.
FR44: Investor can access all investment documents.
FR45: System auto-generates K-1-equivalent tax documents. (Phase 2)
FR46: Owner can send capital calls to investors with deal packages. (Phase 2)
FR47: System tracks distribution payments with type classification.
FR48: System syncs calendars, rates, and availability with Airbnb, Vrbo, and Booking.com. (Phase 2)
FR49: System auto-generates cleaning tasks triggered by guest check-out. (Phase 2)
FR50: Cleaning team completes room-by-room digital checklists with photo verification. (Phase 2)
FR51: Cleaning team can report damage with photos, auto-creating maintenance ticket and guest damage claim. (Phase 2)
FR52: System tracks supply inventory per property with low-stock alerts. (Phase 2)
FR53: System delivers unique smart lock codes per guest. (Phase 2)
FR54: System provides a digital welcome guide per property. (Phase 2)
FR55: System supports AI-powered guest communication. (Phase 3)
FR56: System integrates with dynamic pricing engines. (Phase 3)
FR57: Owner can create renovation projects per property with budget, phases, and timeline. (Phase 2)
FR58: System tracks budget vs actual spend per line item with overrun alerts. (Phase 2)
FR59: Contractors upload daily progress photos visible in timeline view. (Phase 2)
FR60: System supports milestone-based payment triggers. (Phase 2)
FR61: System builds a historical cost-per-square-foot database. (Phase 2)
FR62: System tracks ROI per renovation component. (Phase 2)
FR63: Owner can manage deal pipeline on a Kanban board. (Phase 2)
FR64: System provides deal analysis using market data and operator's historical costs. (Phase 2)
FR65: System auto-generates due diligence checklists with deadline tracking. (Phase 2)
FR66: System scores deals 1-100 based on operator's portfolio history. (Phase 3)
FR67: Owner can generate a seller's package from property's full history. (Phase 2)
FR68: System tracks buyer inquiries and offer management. (Phase 2)
FR69: System provides AI-estimated property valuation. (Phase 3)
FR70: Vendors receive job notifications with scope, photos, and address.
FR71: Vendors submit invoices in-app or via photo capture.
FR72: System calculates vendor performance scores.
FR73: High-performing vendors earn preferred status.
FR74: System provides property-centric communication channels.
FR75: System supports multi-language content.
FR76: System provides emergency protocol activation.

### Non-Functional Requirements

NFR1: Dashboard page load < 2s for portfolios up to 100 properties.
NFR2: Search results return in < 500ms.
NFR3: Bank feed sync processes up to 1,000 transactions in 5 minutes.
NFR4: Real-time notifications delivered within 3 seconds.
NFR5: Concurrent support for 50 active users per tenant.
NFR6: All data encrypted at rest (AES-256) and in transit (TLS 1.3).
NFR7: Auth via email/password with MFA option. OAuth2 for SSO.
NFR8: Row-level security enforcing tenant isolation at database level.
NFR9: Role-based access control on both API and UI layers.
NFR10: PCI DSS compliance via Stripe.
NFR11: Immutable audit log for all financial transactions.
NFR12: Automated vulnerability scanning in CI/CD.
NFR13: Session management with configurable timeout.
NFR14-17: Scalability to 10K+ operators, 1M+ properties, cloud file storage, background job queue.
NFR18-20: WCAG 2.1 AA accessibility compliance.
NFR21-26: REST API with OpenAPI, webhooks, Plaid, Stripe, OAuth2, CSV/PDF export.
NFR27-30: 99.9% uptime, automated backups, graceful degradation, offline sync.

### Additional Requirements (from Architecture)

- Monorepo structure: Next.js frontend + NestJS API + shared types package (Turborepo)
- PostgreSQL with Row-Level Security for multi-tenancy
- Double-entry accounting with integer cents (no floating point)
- Adapter pattern for all external services (Plaid, Stripe, future integrations)
- BullMQ for background job processing
- WebSocket (Socket.io) for real-time updates

### FR Coverage Map

FR1-FR5: Epic 2 (Property Management Core)
FR6-FR15: Epic 3 (Financial Engine)
FR16-FR20: Epic 4 (Dashboard & Alerts)
FR21-FR32: Epic 5 (Tenant Portal)
FR33-FR41: Epic 6 (Maintenance Operations)
FR42-FR47: Epic 7 (Investor Portal)
FR48-FR56: Epic 10 (Short-Term Rental Operations — Phase 2)
FR57-FR62: Epic 11 (Renovation Management — Phase 2)
FR63-FR66: Epic 12 (Acquisition Pipeline — Phase 2)
FR67-FR69: Epic 13 (Property Disposition — Phase 2)
FR70-FR73: Epic 8 (Vendor Management)
FR74-FR76: Epic 9 (Communication & Notifications)

## Epic List

### Epic 1: Project Foundation & Infrastructure Setup
Bootstrap the monorepo, database, authentication, and deployment pipeline so that all subsequent features have a solid technical foundation.
**FRs covered:** None directly (infrastructure enabling all FRs). Addresses NFR6-13, NFR14-17, NFR27.

### Epic 2: Property Management Core
Owner can manage their property portfolio — create properties, manage units, assign to entities, and maintain property knowledge bases.
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Epic 3: Financial Engine
Owner has a complete accounting system — bank feeds, auto-categorization, double-entry ledger, P&L per property, multi-entity support, and tax preparation.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15

### Epic 4: Dashboard & Alerts
Owner opens the app and immediately knows the state of their business — portfolio metrics, prioritized actions, configurable alerts, and property comparisons.
**FRs covered:** FR16, FR17, FR18, FR19, FR20

### Epic 5: Tenant Portal
Tenants can pay rent, submit maintenance requests, access documents, communicate with management, and manage their tenancy — all self-service.
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32

### Epic 6: Maintenance Operations
Maintenance technicians receive, execute, and document work orders efficiently with routing, parts tracking, time logging, and asset management.
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41

### Epic 7: Investor Portal
Investors can track returns, access documents, view property P&L, and receive distributions — all self-service with full transparency.
**FRs covered:** FR42, FR43, FR44, FR45, FR46, FR47

### Epic 8: Vendor Management
Vendors receive jobs, submit invoices, track payments, and build reputation — creating a quality-driven contractor ecosystem.
**FRs covered:** FR70, FR71, FR72, FR73

### Epic 9: Communication & Notifications
All stakeholders communicate through unified channels with multi-language support, emergency protocols, and real-time notifications.
**FRs covered:** FR74, FR75, FR76

### Epic 10: Short-Term Rental Operations (Phase 2)
STR properties are managed end-to-end — channel sync, cleaning automation, guest communication, smart locks, and analytics.
**FRs covered:** FR48, FR49, FR50, FR51, FR52, FR53, FR54, FR55, FR56

### Epic 11: Renovation Management (Phase 2)
Property renovations are tracked with budget control, contractor coordination, and ROI analysis.
**FRs covered:** FR57, FR58, FR59, FR60, FR61, FR62

### Epic 12: Acquisition Pipeline (Phase 2)
New property deals flow through a managed pipeline from lead to closing with analysis and due diligence.
**FRs covered:** FR63, FR64, FR65, FR66

### Epic 13: Property Disposition (Phase 2)
Properties being sold have auto-generated packages, buyer tracking, and valuation tools.
**FRs covered:** FR67, FR68, FR69

---

## Epic 1: Project Foundation & Infrastructure Setup

Goal: Bootstrap the technical foundation so that all subsequent features can be built on a solid, secure, multi-tenant platform.

### Story 1.1: Initialize Monorepo Structure

As a developer,
I want the project scaffolded as a Turborepo monorepo with Next.js frontend, NestJS API, and shared types package,
So that I have a consistent, type-safe development environment from day one.

**Acceptance Criteria:**

**Given** a fresh development environment with Node.js 20+ installed
**When** I run the project initialization commands from the architecture document
**Then** the monorepo is created with `apps/web` (Next.js), `apps/api` (NestJS), and `packages/shared` directories
**And** TypeScript strict mode is enabled across all packages
**And** Turborepo builds all packages successfully
**And** Docker Compose starts local PostgreSQL and Redis

### Story 1.2: Database Schema & Multi-Tenancy

As a developer,
I want the core PostgreSQL schema with Prisma ORM and Row-Level Security policies,
So that tenant data isolation is enforced at the database level from the start.

**Acceptance Criteria:**

**Given** a running PostgreSQL instance
**When** I run Prisma migrations
**Then** core tables are created (tenants, users, properties, units) with `tenant_id` on every tenant-scoped table
**And** RLS policies are active ensuring queries only return rows matching the authenticated tenant
**And** a seed script populates test data for 2 tenants with isolated data
**And** all monetary columns use integer type with `_cents` suffix

### Story 1.3: Authentication & Authorization

As a user of any role,
I want to log in securely and access only the features my role permits,
So that the system is secure and each role sees only relevant functionality.

**Acceptance Criteria:**

**Given** a registered user with a specific role (owner, tenant, technician, etc.)
**When** they log in with email/password
**Then** a JWT token is issued with tenant_id and role claims
**And** NestJS RBAC guards restrict API endpoints to authorized roles
**And** tenant scoping middleware injects tenant_id into every request
**And** unauthorized access attempts return 403 with appropriate error message
**And** sessions expire after configurable timeout with refresh token support

### Story 1.4: CI/CD Pipeline & Deployment

As a developer,
I want automated testing and deployment on every PR and merge,
So that code quality is maintained and deployments are reliable.

**Acceptance Criteria:**

**Given** a pull request is opened against the main branch
**When** CI runs
**Then** ESLint, Prettier, and TypeScript compilation checks pass
**And** all unit and integration tests pass
**And** a preview deployment is created on Vercel (frontend) and staging environment (API)
**When** the PR is merged to main
**Then** production deployment is triggered automatically
**And** database migrations run before the new version goes live

### Story 1.5: API Response Format & Error Handling

As a frontend developer,
I want all API responses to follow a consistent format,
So that I can build reliable data fetching without handling different response shapes.

**Acceptance Criteria:**

**Given** any API request
**When** the request succeeds
**Then** the response follows `{ data, meta: { requestId } }` format for single items and `{ data, meta: { total, page, pageSize, requestId } }` for lists
**When** the request fails
**Then** the response follows `{ error: { code, message, details }, meta: { requestId } }` format
**And** all errors are logged with request context via NestJS exception filter

---

## Epic 2: Property Management Core

Goal: Owner can manage their full property portfolio with units, entity assignments, and property-level knowledge.

### Story 2.1: Property CRUD

As an owner,
I want to create, edit, and archive properties with all key details,
So that my entire portfolio is tracked in one system.

**Acceptance Criteria:**

**Given** an authenticated owner
**When** they create a new property with address, type (STR/LTR/renovation/for-sale), photos, and documents
**Then** the property is saved and appears in their portfolio list
**And** the property is scoped to their tenant and entity/LLC
**When** they edit a property
**Then** changes are saved and audit logged
**When** they archive a property
**Then** it no longer appears in active views but data is retained

### Story 2.2: Unit Management

As an owner,
I want to create and manage units within properties,
So that I can track each rentable space individually.

**Acceptance Criteria:**

**Given** an existing property
**When** the owner creates a unit with number, bedrooms, bathrooms, sqft, and rent amount
**Then** the unit is linked to the property and available for lease assignment
**And** the unit displays its current occupancy status (vacant/occupied/maintenance)

### Story 2.3: Entity/LLC Assignment

As an owner,
I want to assign properties to different entities/LLCs,
So that financial tracking is separated per legal entity.

**Acceptance Criteria:**

**Given** an owner with multiple entities configured
**When** they assign a property to an entity
**Then** all financial transactions for that property are recorded under that entity's books
**And** P&L reports can be generated per entity and consolidated across all entities

### Story 2.4: Portfolio Map View

As an owner,
I want to see all my properties on a map with color-coded status indicators,
So that I get a visual overview of my portfolio's health.

**Acceptance Criteria:**

**Given** an owner with multiple properties
**When** they open the map view
**Then** each property appears as a pin color-coded by status (green=performing, yellow=attention, red=problem)
**And** tapping a pin shows a summary card with key metrics
**And** filters allow viewing by occupancy, cash flow, maintenance load, or renovation status

### Story 2.5: Property Knowledge Base

As an owner or maintenance tech,
I want a knowledge base per property storing manuals, contacts, and quirks,
So that institutional knowledge is preserved and accessible to the team.

**Acceptance Criteria:**

**Given** a property
**When** a team member adds information (appliance manuals, contractor contacts, utility accounts, notes)
**Then** it is stored in a searchable knowledge base linked to that property
**And** any authorized user for that property can view and search the knowledge base

---

## Epic 3: Financial Engine

Goal: Owner has complete financial visibility — bank feeds, auto-categorization, P&L per property, multi-entity accounting, and tax preparation.

### Story 3.1: Bank Feed Integration (Plaid)

As an owner,
I want to connect my bank accounts and have transactions auto-imported,
So that I don't manually enter expenses and income.

**Acceptance Criteria:**

**Given** an owner initiating bank connection
**When** they authenticate via Plaid Link
**Then** the bank account is connected and transactions sync within 4 hours
**And** daily background sync pulls new transactions automatically
**And** the Plaid adapter handles rate limits and institution-specific errors gracefully

### Story 3.2: AI Transaction Categorization

As an owner,
I want transactions auto-categorized by AI,
So that bookkeeping is mostly automated.

**Acceptance Criteria:**

**Given** new transactions imported from bank feed
**When** the AI categorization job runs
**Then** each transaction gets a suggested category based on vendor name, amount, and historical patterns
**And** the owner can approve with one click or override the suggestion
**And** the system learns from overrides to improve future suggestions

### Story 3.3: Chart of Accounts & Double-Entry Ledger

As an accountant,
I want a pre-configured chart of accounts with double-entry accounting,
So that the books are professional-grade and audit-ready.

**Acceptance Criteria:**

**Given** a new tenant setup
**When** the accounting module initializes
**Then** a chart of accounts pre-configured for real estate is created (rental income, maintenance, mortgage interest, depreciation, capital improvements, etc.)
**And** every financial transaction creates balanced debit and credit entries
**And** all ledger entries are append-only (immutable)
**And** all monetary values are stored as integer cents

### Story 3.4: Real-Time P&L Per Property

As an owner,
I want to see profit and loss per property, per entity, and across my portfolio,
So that I know exactly which properties are making money.

**Acceptance Criteria:**

**Given** properties with financial transactions
**When** the owner views P&L
**Then** they see income, expenses, and net for any time period (monthly/quarterly/yearly/lifetime)
**And** they can drill down from portfolio → entity → property → individual transactions
**And** data updates in real-time as new transactions are categorized

### Story 3.5: Rent Collection via Stripe

As a tenant,
I want to pay rent through the app using my preferred payment method,
So that paying rent is effortless.

**Acceptance Criteria:**

**Given** a tenant with an active lease
**When** they initiate a payment
**Then** they can pay via ACH, credit/debit card
**And** the payment is processed through Stripe
**And** a receipt is generated and visible in payment history
**And** the transaction is auto-recorded in the property's ledger
**And** late fees are calculated per jurisdiction-specific rules if applicable

### Story 3.6: Trust Account & Security Deposit Tracking

As an owner,
I want security deposits tracked in compliant trust accounts,
So that I meet legal requirements for deposit handling.

**Acceptance Criteria:**

**Given** a tenant with a security deposit
**When** the deposit is received
**Then** it is recorded in a separate trust account per state requirements
**And** trust account reconciliation is available monthly
**And** deposit deductions at move-out are itemized with documentation

### Story 3.7: 1099 Generation

As an owner,
I want 1099 forms auto-generated for contractors paid over $600,
So that year-end tax compliance is automated.

**Acceptance Criteria:**

**Given** vendors/contractors with payments totaling $600+ in a tax year
**When** the owner initiates 1099 generation
**Then** 1099-NEC forms are auto-generated with correct amounts
**And** forms are available for download and sending to vendors through the vendor portal

---

## Epic 4: Dashboard & Alerts

Goal: Owner opens the app and immediately knows the state of their business with actionable intelligence.

### Story 4.1: Command Center Dashboard

As an owner,
I want a single dashboard showing my portfolio's health,
So that I can assess my business before my first cup of coffee.

**Acceptance Criteria:**

**Given** an authenticated owner
**When** they load the dashboard
**Then** they see: total portfolio value, monthly cash flow, occupancy rate, overdue rents count, open maintenance tickets, active renovations, upcoming lease expirations
**And** the page loads in under 2 seconds
**And** metrics update in real-time via WebSocket

### Story 4.2: Daily Action Feed

As an owner,
I want a prioritized list of today's actions,
So that I know what needs my attention right now.

**Acceptance Criteria:**

**Given** an owner with active properties
**When** they view the action feed
**Then** they see items ranked by urgency: overdue rents, maintenance needing approval, lease expirations, vendor invoices pending, upcoming check-ins/check-outs
**And** each item links directly to the relevant detail screen

### Story 4.3: Configurable Alert Rules

As an owner,
I want to set up custom alert rules with escalation chains,
So that problems are caught and escalated automatically.

**Acceptance Criteria:**

**Given** an owner configuring alerts
**When** they create a rule (e.g., "rent 3 days late → text tenant; 5 days late → notify me")
**Then** the rule is saved and evaluated automatically
**And** escalation actions fire on schedule
**And** the owner can view alert history and modify rules

### Story 4.4: Vacancy Loss Tracker

As an owner,
I want to see the real-time cost of vacant units,
So that I'm motivated to fill vacancies faster.

**Acceptance Criteria:**

**Given** a vacant unit with a known market rent
**When** the owner views vacancy metrics
**Then** they see daily/monthly vacancy cost per unit and total across portfolio
**And** the number updates daily

### Story 4.5: Property Comparison

As an owner,
I want to compare properties side-by-side on any metric,
So that I can identify top and bottom performers.

**Acceptance Criteria:**

**Given** an owner selecting 2+ properties
**When** they open comparison view
**Then** they see side-by-side metrics (cash flow, occupancy, maintenance cost, ROI)
**And** they can toggle between different time periods

---

## Epic 5: Tenant Portal

Goal: Tenants manage their entire tenancy self-service — payments, maintenance, documents, and communication.

### Story 5.1: One-Tap Rent Payment

As a tenant,
I want to pay rent with one tap,
So that paying is fast and painless.

**Acceptance Criteria:**

**Given** a tenant with a saved payment method
**When** they tap "Pay Rent"
**Then** payment is processed and confirmed within seconds
**And** a receipt is generated and visible in payment history

### Story 5.2: Auto-Pay Setup

As a tenant,
I want to enable automatic rent payment,
So that I never miss a payment.

**Acceptance Criteria:**

**Given** a tenant enabling auto-pay
**When** they select a payment method and date
**Then** rent is automatically charged on the configured date each month
**And** the tenant receives confirmation before and after each auto-payment

### Story 5.3: Maintenance Request Submission

As a tenant,
I want to submit maintenance requests with photos and urgency level,
So that issues are reported clearly and quickly.

**Acceptance Criteria:**

**Given** a tenant with an issue
**When** they submit a request with category, description, photos/video, and urgency
**Then** a work order is created and assigned to the maintenance queue
**And** the tenant receives confirmation with a tracking number
**And** they can track status in real-time (submitted → assigned → in-progress → completed)

### Story 5.4: Maintenance Rating

As a tenant,
I want to rate completed maintenance jobs,
So that service quality is tracked and improved.

**Acceptance Criteria:**

**Given** a completed maintenance request
**When** the tenant rates the job (1-5 stars with optional comment)
**Then** the rating is recorded and contributes to the technician's/vendor's performance score

### Story 5.5: Digital Lease Vault

As a tenant,
I want to access my lease and all related documents anytime,
So that I always have my records available.

**Acceptance Criteria:**

**Given** a tenant with an active lease
**When** they open the documents section
**Then** they see their current lease, addenda, move-in inspection photos, pet agreements, and parking assignments
**And** they can download any document as PDF

### Story 5.6: E-Sign Lease Renewals

As a tenant,
I want to e-sign lease renewals in the app,
So that renewals are handled without paperwork.

**Acceptance Criteria:**

**Given** a renewal offer sent by the owner
**When** the tenant reviews and e-signs
**Then** the signed document is stored in the lease vault
**And** both parties receive confirmation
**And** the lease record is updated with new terms

### Story 5.7: In-App Messaging

As a tenant,
I want to message my property manager with read receipts,
So that communication is documented and trackable.

**Acceptance Criteria:**

**Given** a tenant composing a message
**When** they send it with optional file attachments
**Then** the message is delivered to the property manager with notification
**And** read receipts confirm when the message is viewed
**And** all messages are searchable and permanently logged

### Story 5.8: Emergency Escalation

As a tenant,
I want a panic button for emergencies,
So that critical issues get immediate attention.

**Acceptance Criteria:**

**Given** a tenant with an emergency (fire, flood, gas leak)
**When** they tap the emergency button
**Then** an alert is sent immediately to the on-call person (bypassing normal queue)
**And** the emergency is logged with timestamp

### Story 5.9: Payment History & Receipts

As a tenant,
I want to view my full payment history with downloadable receipts,
So that I have records for my taxes and personal bookkeeping.

**Acceptance Criteria:**

**Given** a tenant with payment history
**When** they view the payments section
**Then** they see all payments with date, amount, method, and status
**And** they can download individual receipts as PDF

### Story 5.10: Payment Plan Request

As a tenant experiencing financial hardship,
I want to request a payment plan,
So that I can stay in my home while catching up.

**Acceptance Criteria:**

**Given** a tenant unable to pay full rent
**When** they submit a payment plan request with proposed terms
**Then** the owner is notified and can approve, modify, or decline
**And** approved plans track partial payments against the balance

---

## Epic 6: Maintenance Operations

Goal: Maintenance technicians efficiently receive, execute, document, and close work orders with full field support.

### Story 6.1: Work Order Creation & Assignment

As an owner/PM,
I want to create and assign work orders from multiple sources,
So that all maintenance flows through one system.

**Acceptance Criteria:**

**Given** a maintenance need (tenant request, inspection finding, manual creation)
**When** a work order is created
**Then** it includes property, unit, description, photos, priority level, and access instructions
**And** it can be assigned to an internal tech or external vendor
**And** the assignee is notified immediately

### Story 6.2: Technician Work Order Queue

As a maintenance technician,
I want to see my assigned jobs sorted by priority,
So that I handle the most urgent issues first.

**Acceptance Criteria:**

**Given** a technician with assigned work orders
**When** they open their queue
**Then** jobs are sorted: emergency → urgent → routine
**And** each job shows property address, issue, tenant photos, and unit asset history

### Story 6.3: Photo Documentation with Metadata

As a technician,
I want to upload before/after photos with GPS and timestamp,
So that work is documented with verifiable proof.

**Acceptance Criteria:**

**Given** a technician at a job site
**When** they take photos through the app
**Then** photos are tagged with GPS coordinates, timestamp, and work order ID
**And** photos are visible to the owner in the work order detail view

### Story 6.4: Time & Labor Logging

As a technician,
I want to log my time per work order,
So that labor costs are accurately tracked per property.

**Acceptance Criteria:**

**Given** a technician starting a job
**When** they clock in and out
**Then** travel time and work time are logged separately
**And** labor cost is calculated and attributed to the property's maintenance expenses

### Story 6.5: Parts Expense Scanning

As a technician,
I want to scan parts barcodes/receipts to log expenses,
So that material costs are tracked to the correct property automatically.

**Acceptance Criteria:**

**Given** a technician purchasing parts
**When** they scan a barcode or receipt photo
**Then** the item and cost are logged to the active work order's property
**And** the expense appears in the property's financial ledger

### Story 6.6: Preventive Maintenance Scheduling

As an owner,
I want recurring maintenance tasks auto-generated,
So that properties are proactively maintained.

**Acceptance Criteria:**

**Given** preventive maintenance rules configured (e.g., HVAC filter every 3 months)
**When** a scheduled date arrives
**Then** a work order is auto-created and assigned
**And** the owner can view all upcoming preventive maintenance on a calendar

### Story 6.7: Asset Tracking

As an owner,
I want to track appliances and systems per unit with warranty info,
So that I know what's in each unit and when warranties expire.

**Acceptance Criteria:**

**Given** a unit with tracked assets (HVAC, water heater, appliances)
**When** the owner views unit details
**Then** they see each asset with model, install date, warranty expiry, and service history

---

## Epic 7: Investor Portal

Goal: Investors have full transparency into their investments with self-service access to returns, documents, and distributions.

### Story 7.1: Investor Returns Dashboard

As an investor,
I want to see my investment performance at a glance,
So that I trust where my money is and how it's performing.

**Acceptance Criteria:**

**Given** an investor with active investments
**When** they open their portal
**Then** they see: total invested, current estimated value, IRR, cash-on-cash return, equity multiple
**And** interactive charts show returns over time

### Story 7.2: Property P&L Transparency

As an investor,
I want to see the full P&L of properties I'm invested in,
So that I have complete transparency.

**Acceptance Criteria:**

**Given** an investor linked to specific properties
**When** they view a property's financials
**Then** they see actual income, expenses, vacancy, maintenance costs — not sanitized summaries
**And** data scoping ensures they only see properties they're invested in (RLS enforced)

### Story 7.3: Distribution Tracking

As an investor,
I want to see every distribution I've received with details,
So that I have a complete record for tax purposes.

**Acceptance Criteria:**

**Given** distributions paid to an investor
**When** they view the distributions tab
**Then** they see each payment with date, amount, property source, and type (return of capital vs profit)
**And** projected next distribution date is shown when available

### Story 7.4: Investor Document Vault

As an investor,
I want all my investment documents in one place,
So that I never need to ask for paperwork.

**Acceptance Criteria:**

**Given** an investor with investment documents
**When** they open the documents section
**Then** they see operating agreements, closing statements, insurance certs, appraisals
**And** documents are versioned and downloadable

---

## Epic 8: Vendor Management

Goal: Vendors receive jobs, submit invoices, track payments, and build reputation within the Casa Meni ecosystem.

### Story 8.1: Vendor Job Notification & Acceptance

As a vendor,
I want to receive job notifications with full details,
So that I know exactly what's needed before I show up.

**Acceptance Criteria:**

**Given** a work order assigned to an external vendor
**When** the vendor receives the notification
**Then** they see scope, photos, address, urgency, and access instructions
**And** they can accept, decline, or submit an estimate

### Story 8.2: Vendor Invoice Submission

As a vendor,
I want to submit invoices in-app,
So that I get paid without chasing paperwork.

**Acceptance Criteria:**

**Given** a vendor completing a job
**When** they submit an invoice (in-app form or photo capture)
**Then** the invoice is routed to the owner for approval
**And** the vendor can track approval status and payment history

### Story 8.3: Vendor Performance Scoring

As an owner,
I want vendors scored on quality and reliability,
So that I can identify and reward the best contractors.

**Acceptance Criteria:**

**Given** a vendor with completed jobs
**When** the system calculates their score
**Then** it factors response time, quality ratings (from owner + tenant), and completion rate
**And** high-performing vendors earn "preferred" status with priority job access

---

## Epic 9: Communication & Notifications

Goal: All stakeholders communicate through unified channels with real-time notifications and emergency protocols.

### Story 9.1: Notification Engine

As any user,
I want to receive real-time notifications for events relevant to my role,
So that I stay informed without checking the app constantly.

**Acceptance Criteria:**

**Given** a triggering event (payment received, work order assigned, alert fired, message sent)
**When** the event occurs
**Then** relevant users receive push notification (mobile), email, and in-app notification within 3 seconds
**And** notification preferences are configurable per user

### Story 9.2: Property-Centric Communication Channels

As a team member,
I want communication organized by property,
So that conversations are contextual and searchable.

**Acceptance Criteria:**

**Given** a property with multiple team members
**When** someone posts in the property channel
**Then** all authorized team members see the message with threading support
**And** files can be attached and messages are searchable

### Story 9.3: Emergency Protocol Activation

As an owner,
I want a one-button emergency mode,
So that crisis situations are handled systematically.

**Acceptance Criteria:**

**Given** an emergency at a property
**When** the owner activates emergency protocol
**Then** all affected tenants are auto-notified
**And** emergency contractors are dispatched
**And** insurance is contacted
**And** all actions are logged for claims documentation

---

## Epic 10: Short-Term Rental Operations (Phase 2)

Goal: STR properties are managed end-to-end with channel sync, automated cleaning, guest communication, and smart access.

### Story 10.1: Channel Management (Airbnb/Vrbo/Booking.com)
FR48: Sync calendars, rates, and availability in real-time across channels.

### Story 10.2: Auto-Scheduled Cleaning
FR49: Auto-generate cleaning tasks from guest check-out with time windows and rush flags.

### Story 10.3: Cleaning Checklists with Photo Verification
FR50: Room-by-room digital checklists with photo proof.

### Story 10.4: Damage Reporting Pipeline
FR51: Cleaning damage report → maintenance ticket + guest damage claim in one flow.

### Story 10.5: Supply Inventory Tracking
FR52: Per-property consumable tracking with low-stock alerts.

### Story 10.6: Smart Lock Integration
FR53: Unique guest codes, time-windowed, role-based codes for cleaners/techs.

### Story 10.7: Digital Welcome Guide
FR54: Interactive, branded, per-property guest guide.

---

## Epic 11: Renovation Management (Phase 2)

### Story 11.1: Renovation Project Creation (FR57)
### Story 11.2: Budget vs Actual Tracking (FR58)
### Story 11.3: Contractor Progress Portal (FR59)
### Story 11.4: Milestone-Based Payments (FR60)
### Story 11.5: Cost-Per-SqFt Database (FR61)
### Story 11.6: Renovation ROI Tracking (FR62)

---

## Epic 12: Acquisition Pipeline (Phase 2)

### Story 12.1: Deal Pipeline Kanban (FR63)
### Story 12.2: Deal Analysis Calculator (FR64)
### Story 12.3: Due Diligence Checklists (FR65)
### Story 12.4: AI Deal Scoring (FR66 — Phase 3)

---

## Epic 13: Property Disposition (Phase 2)

### Story 13.1: Auto-Generated Seller Package (FR67)
### Story 13.2: Buyer Inquiry Management (FR68)
### Story 13.3: AI Property Valuation (FR69 — Phase 3)

---

*End of Epic Breakdown — Casa Meni v1.0*
*MVP: Epics 1–9 (45 stories) | Phase 2: Epics 10–13 (16 stories)*
