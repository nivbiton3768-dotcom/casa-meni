---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-meni.md'
  - '_bmad-output/planning-artifacts/product-brief-meni-distillate.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-05-02-010400.md'
workflowType: 'prd'
documentCounts:
  briefs: 2
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'saas_b2b'
  domain: 'proptech_real_estate'
  complexity: 'high'
  projectContext: 'greenfield'
releaseMode: 'phased'
---

# Product Requirements Document — Casa Meni

**Author:** Nivbi
**Date:** 2026-05-02
**Version:** 1.0

---

## Executive Summary

Casa Meni is a unified SaaS platform for small-to-mid real estate operators (5–50 units) who buy, renovate, rent (short-term and long-term), maintain, and sell properties. It replaces 5–7 disconnected tools — AppFolio, Guesty, DealCheck, Stessa, Buildertrend, QuickBooks — with a single system where every dollar, work order, lease, renovation photo, and investor report lives in one place.

The platform serves every stakeholder through role-based access: owner/operator, tenants, maintenance technicians, cleaning teams, investors, vendors, short-term guests, accountants, inspectors, and agents. Each role gets a purpose-built experience within the same unified data layer.

The core insight: because all operational data lives in one system, Casa Meni enables features structurally impossible for any combination of point solutions — deal scoring from your own renovation history, auto-generated seller packages from years of ownership data, real-time investor dashboards across mixed STR/LTR portfolios, and renovation ROI tracking by component type. Over time, an operator's Casa Meni dataset becomes one of their most valuable business assets.

### What Makes This Special

1. **Unified data creates impossible features.** Acquisition costs, renovation expenses, rental income, maintenance spend, and sale proceeds in one system unlock analytics no combination of tools can replicate.
2. **Full lifecycle coverage.** No competitor spans buy → renovate → rent → maintain → sell. Each existing tool covers one slice; Casa Meni covers the entire cycle.
3. **Compounding data moat.** Every property managed generates operational intelligence — cost-per-sqft databases, tenant quality scores, seasonal pricing patterns, vendor reliability rankings — that compounds in value.
4. **Professional investor experience attracts capital.** Live dashboards, automated K-1s, and transparent P&Ls help operators raise more capital than competitors sending quarterly PDFs.

## Project Classification

- **Project Type:** SaaS B2B Platform (multi-tenant, role-based access, subscription model)
- **Domain:** PropTech / Real Estate (with fintech-adjacent concerns: payments, financial reporting, investor management)
- **Complexity:** High (10+ user roles, payment processing, multi-entity accounting, jurisdiction-varying compliance, 3rd-party API integrations)
- **Project Context:** Greenfield — new product built from scratch

---

## Success Criteria

### User Success

- Operators report eliminating spreadsheet reconciliation within 30 days of onboarding
- 80%+ of tenants actively use the portal (rent payment, maintenance requests) within 60 days
- Maintenance technicians complete work orders with photo documentation on 95%+ of jobs
- Investors access their portal monthly without requesting manual reports

### Business Success

- Achieve 100 managed units across 10+ operators within 12 months of launch
- 90%+ annual retention rate (measured by continued active usage)
- Net Promoter Score of 50+ among owner-operators
- Average revenue per unit of $X/month (pricing TBD)

### Technical Success

- 99.9% uptime for core services (rent collection, dashboard, maintenance)
- Bank feed sync latency under 4 hours
- Page load times under 2 seconds for dashboard views
- Mobile app works offline for field operations with sync under 30 seconds

### Measurable Outcomes

| Metric | Baseline (Today) | Target (6mo post-launch) |
|--------|------------------|--------------------------|
| Hours/month on manual reconciliation | 10–15 hours | < 1 hour |
| Average work order resolution time | Untracked | < 48 hours |
| Investor report generation time | 4–8 hours/quarter | 0 (automated) |
| Portfolio P&L visibility | Partial, lagging | 100%, real-time |
| Vacancy awareness delay | Days | Instant (alerts) |

---

## Product Scope

### MVP — Phase 1 (Months 1–6)

The foundation that makes the app immediately useful. An operator can manage their portfolio, collect rent, handle maintenance, and share basic reports with investors.

**Core capabilities:**
- Property & unit database with inspection templates
- Financial engine (P&L per property, bank feed via Plaid, AI auto-categorization, multi-entity/LLC support, chart of accounts)
- Command center dashboard (portfolio overview, daily action feed, smart alerts)
- Tenant portal (rent collection via Stripe — ACH/card, maintenance requests with photo/video, digital lease vault, communication hub)
- Maintenance work order system (assignment, priority queue, photo documentation, time tracking, basic parts logging)
- Basic investor portal (returns view, document sharing, distribution tracking)
- Owner/operator reporting (portfolio P&L, vacancy tracking, alert configuration)

### Growth Features — Phase 2 (Months 7–12)

Expand into STR operations, renovation management, and acquisition pipeline — completing the lifecycle.

- Short-term rental operations (channel management via Airbnb/Vrbo APIs, auto-scheduled cleaning, guest communication, dynamic pricing integration)
- Renovation project management (budget vs actual tracking, contractor progress with photos, material cost tracking, milestone-based payments)
- Deal pipeline & acquisition tools (Kanban pipeline, CRM for leads, comp analysis, due diligence checklists, deal scoring)
- Advanced investor portal (K-1 auto-generation, capital call workflows, branded PDF reports)
- Vendor ecosystem (performance scoring, preferred status, in-app invoicing)
- Tenant experience enhancements (move-in/move-out wizard, payment plans, community board)

### Vision — Phase 3 (Year 2+)

Intelligence layer and platform play.

- AI business advisor (monthly optimization insights)
- AI guest concierge (multilingual chatbot)
- Predictive maintenance via IoT sensors
- Direct booking website builder
- On-demand cleaning marketplace
- Market intelligence from aggregated anonymized data
- White-label SaaS option
- Mobile-native field apps with GPS routing and offline mode

---

## User Journeys

### Journey 1: Owner Morning Check-In

**Actor:** Nivbi (Owner/Operator)
**Trigger:** Opens app Monday morning with coffee.

1. Dashboard loads showing portfolio health: 12 properties, $47K monthly cash flow, 92% occupancy, 3 open maintenance tickets, 1 renovation at 65% complete.
2. Daily action feed shows: 2 overdue rents (auto-reminder sent), 1 lease expiring in 30 days, 1 vendor invoice awaiting approval, guest check-in today at Unit 7A.
3. Taps overdue rent → sees tenant Maria is 5 days late → reviews payment history (usually on time) → sends personal message through communication hub.
4. Taps lease expiration → app shows market comp at $1,450 vs current $1,350 → generates renewal offer at $1,400 → sends to tenant for e-signature.
5. Approves vendor invoice ($275 for plumbing repair at Unit 3B) → auto-logs to property P&L → vendor sees "payment scheduled."
6. Checks renovation dashboard for Elm St property → budget $85K, spent $62K, phase: flooring complete, painting starts tomorrow. On track.

### Journey 2: Tenant Maintenance Request

**Actor:** Maria (Long-Term Tenant)
**Trigger:** Kitchen faucet is leaking.

1. Opens Casa Meni app → taps "Maintenance Request."
2. Selects category: Plumbing. Urgency: Medium. Takes photo of leaking faucet. Adds note: "Dripping constantly, getting worse."
3. Submits → receives confirmation: "Request #1247 submitted. We'll assign a technician shortly."
4. 2 hours later: push notification — "Mike has been assigned. ETA: Thursday 2pm."
5. Thursday 1:45pm: notification — "Mike is on his way" with live map.
6. Mike arrives, fixes faucet, takes before/after photos, marks complete.
7. Maria gets notification: "Your request is resolved." Rates the service 5 stars with comment "Fast and clean!"
8. Rating feeds into Mike's performance score on the owner's side.

### Journey 3: Maintenance Tech Work Day

**Actor:** Mike (Maintenance Technician)
**Trigger:** Opens app at start of work day.

1. Sees 4 work orders prioritized: 1 emergency (no hot water at Unit 5A), 2 urgent, 1 routine.
2. App suggests optimal route for all 4 jobs. One tap to navigate to first job.
3. Arrives at Unit 5A → accesses unit knowledge base: "Water heater pilot light — see instructions." → Relights pilot. Photos before/after. GPS-stamped.
4. Needs a new thermocouple → scans barcode at Home Depot → $18.47 auto-logged to Unit 5A's maintenance expenses.
5. Completes repair, logs 45 min work time + 20 min travel. Marks complete.
6. Tenant gets notification. Nivbi sees the ticket close in real-time on dashboard.
7. Moves to next job. App re-routes based on remaining work orders.

### Journey 4: Cleaning Team Turnover

**Actor:** Rosa (Cleaning Team Lead)
**Trigger:** Guest checks out of STR Unit 7A at 11am. Next guest checks in at 3pm.

1. Auto-notification: "Unit 7A ready for cleaning. Window: 11am–2:30pm. RUSH — back-to-back booking."
2. Opens app → sees room-by-room checklist: Kitchen (12 items), Bathroom (10 items), Bedroom (8 items), Common Areas (6 items).
3. Starts cleaning. Completes each room, takes verification photo per room.
4. Finds broken coffee mug and stain on couch cushion → taps "Report Damage" → takes photos → auto-creates maintenance ticket + flags guest damage deposit.
5. Logs supplies used: 2 toilet paper rolls, 1 soap bar, 1 coffee refill pack.
6. App shows: "Soap inventory LOW at Unit 7A — 1 remaining." Auto-adds to shopping list.
7. Marks cleaning complete at 1:45pm. Nivbi gets "Unit 7A ready" notification. Guest gets check-in details at 2pm.

### Journey 5: Investor Quarterly Review

**Actor:** David (Investor)
**Trigger:** Wants to check returns on his $200K investment.

1. Opens investor portal → sees dashboard: Total invested $200K, current estimated value $235K, IRR 18.2%, cash-on-cash 12.4%.
2. Distributions tab: $6,200 received this quarter. Breakdown by property.
3. Drills into the specific property he invested in → sees full P&L: $3,800/mo rental income, $1,200/mo expenses, $2,600/mo NOI. Maintenance costs up 8% this quarter (HVAC repair).
4. Documents tab: operating agreement, closing statement, insurance cert, latest appraisal — all accessible.
5. Tax section: K-1 auto-generated and available for download.
6. Sees notification: "New investment opportunity: 4BR on Oak St. Deal score: 87/100. Review deal package?"

### Journey 6: Property Acquisition

**Actor:** Nivbi (Owner/Operator)
**Trigger:** Wholesaler sends a potential deal.

1. Creates new lead in deal pipeline: 4BR at 123 Oak St, asking $180K. Source: wholesaler.
2. Runs deal analysis: comp analysis pulls nearby sales. App uses Casa Meni's historical renovation data: "Similar properties averaged $42/sqft for rehab. Estimated rehab: $58K."
3. Projects: ARV $290K, projected rent $2,200/mo, cap rate 7.8%, cash-on-cash 14.2%. Deal score: 87/100 (based on portfolio history).
4. Submits offer at $165K. Tracks negotiation in pipeline.
5. Under contract → due diligence checklist auto-generates: inspection, title search, insurance, financing, environmental. Deadline tracking with alerts.
6. Closes. Property auto-appears in portfolio. Renovation project auto-created from template. Capital call sent to investors.

### Journey Requirements Summary

| Capability | Journeys | Priority |
|------------|----------|----------|
| Dashboard with portfolio metrics | J1 | MVP |
| Daily action feed | J1 | MVP |
| Rent collection & tracking | J1, J2 | MVP |
| Maintenance request submission | J2, J3 | MVP |
| Work order management | J2, J3 | MVP |
| Technician routing & time tracking | J3 | MVP |
| Parts expense scanning | J3 | MVP |
| Cleaning auto-scheduling | J4 | Phase 2 |
| Damage reporting pipeline | J4 | Phase 2 |
| Supply inventory tracking | J4 | Phase 2 |
| Investor returns dashboard | J5 | MVP |
| K-1 auto-generation | J5 | Phase 2 |
| Deal pipeline & scoring | J6 | Phase 2 |
| Comp analysis with historical data | J6 | Phase 2 |
| Due diligence checklist engine | J6 | Phase 2 |
| Capital call workflow | J6 | Phase 2 |

---

## Domain-Specific Requirements

### Financial Compliance

- **Trust Account Management:** Many states require tenant security deposits held in separate trust accounts. The system must support trust account tracking with reconciliation that demonstrates compliance.
- **1099 Reporting:** Auto-generate and e-file 1099-NEC/MISC forms for all vendors/contractors paid over $600 annually.
- **Multi-Entity Accounting:** Support separate books per LLC/entity with consolidated portfolio views. Each entity maintains its own chart of accounts, P&L, and balance sheet.
- **Audit Trail:** Every financial transaction must have an immutable audit trail — who created it, when, what changed. Required for investor transparency and potential audits.

### Property Management Regulations

- **Jurisdiction-Aware Compliance:** Lease terms, notice periods, eviction procedures, and required disclosures vary by state and municipality. The system must support jurisdiction-specific templates and compliance tracking.
- **Fair Housing:** All tenant screening, communication templates, and listing language must support Fair Housing Act compliance. No discriminatory filtering or language.
- **Lead Paint / Environmental Disclosures:** Track required disclosure documents per property based on age and jurisdiction.
- **Habitability Standards:** Maintenance SLAs and inspection templates must support local habitability code requirements.

### Payment Processing

- **PCI DSS Compliance:** All payment processing through certified payment processor (Stripe). No raw card data stored in the application.
- **ACH Compliance:** Rent collection via ACH must comply with NACHA rules including authorization, timing, and dispute resolution.
- **Late Fee Compliance:** Late fee calculation must respect state-specific caps and grace period requirements.

### Data Privacy

- **Tenant PII Protection:** SSN (from screening), financial data, and personal information must be encrypted at rest and in transit.
- **Investor Financial Data:** Investment amounts, returns, and tax documents require equivalent protection to financial services standards.
- **Data Retention:** Define retention policies per data type — tenant records post-move-out, financial records per IRS requirements (typically 7 years), maintenance records for liability protection.

### Integration Requirements

- **Banking:** Plaid for bank feed aggregation. Stripe for payment processing.
- **STR Channels (Phase 2):** Airbnb, Vrbo, Booking.com APIs for calendar sync, rate management, and guest messaging.
- **Smart Locks (Phase 2):** August, Schlage, Yale APIs for code generation and role-based access.
- **Accounting Export:** QuickBooks Online and Xero export for operators who want external CPA access.

---

## Innovation & Novel Patterns

### Detected Innovation Areas

1. **Unified Lifecycle Data Model:** The architectural decision to model properties across their entire lifecycle (acquisition → renovation → rental → maintenance → disposition) in a single data model is novel in this market. Every competitor models properties as "units being managed." Casa Meni models them as "assets moving through a lifecycle." This enables cross-phase analytics no competitor can offer.

2. **Self-Training Deal Scoring:** Using an operator's own historical renovation costs and rental performance to score future acquisition deals. The model improves with every property managed. This creates a personalized AI that becomes more valuable over time — a genuine data moat.

3. **Cross-Role Workflow Automation:** Events in one role's workflow automatically trigger actions in other roles' workflows: guest checkout → cleaning task + smart lock code rotation + supply inventory update. Damage found by cleaner → maintenance ticket + guest damage claim. Inspection finding → work order. This event-driven architecture across role boundaries is architecturally novel.

### Validation Approach

- **Unified Data Model:** Validate with 3-5 beta operators managing mixed portfolios. Measure: can they answer cross-domain questions (e.g., "renovation ROI by property type") that they couldn't answer before?
- **Deal Scoring:** Requires 6+ months of operational data before scoring is meaningful. Launch with manual comp analysis; introduce scoring when data is sufficient.
- **Cross-Role Automation:** Test each pipeline individually (cleaning → maintenance, inspection → work order) before enabling full event chains.

### Risk Mitigation

- **Data model complexity:** Phased rollout — MVP covers rental operations only, lifecycle extensions in Phase 2.
- **AI accuracy:** All AI features (categorization, deal scoring, pricing) include human-in-the-loop approval before any automated action.
- **Integration brittleness:** Channel APIs (Airbnb, Vrbo) change frequently. Abstract behind an adapter layer with graceful degradation.

---

## SaaS B2B Platform Requirements

### Project-Type Overview

Casa Meni is a multi-tenant SaaS platform where each operator (company) is a tenant with isolated data. Within each tenant, multiple user roles access the system with different permissions and UI experiences.

### Multi-Tenant Architecture

- **Tenant Isolation:** Complete data isolation between operators. No operator can see another's data.
- **Tenant Provisioning:** Self-service signup with guided onboarding. CSV import from common tools (Buildium, AppFolio, Stessa) for migration.
- **Tenant Branding (Future):** White-label option for operators who want their own brand on tenant-facing portals.

### Role-Based Access Control (RBAC)

| Role | Scope | Read | Write | Approve | Admin |
|------|-------|------|-------|---------|-------|
| Owner/Admin | Full portfolio | All | All | All | Yes |
| Property Manager | Assigned properties | All assigned | Operations | Maintenance | No |
| Tenant | Own unit | Own data | Requests, payments | — | No |
| Maintenance Tech | Assigned work orders | Work orders, unit info | Status, photos, time | — | No |
| Cleaning Team | Assigned tasks | Tasks, checklists | Status, photos, damage | — | No |
| Investor | Invested properties (read-only) | Returns, P&L, docs | — | — | No |
| Vendor | Assigned jobs | Job details | Status, invoices | — | No |
| Guest (STR) | Active booking | Welcome guide | Issue reports | — | No |
| Accountant | Financials | All financial | Transactions, reconciliation | — | No |
| Inspector | Assigned inspections | Property info | Inspections, photos | — | No |

### Subscription & Billing

- **Pricing Model (TBD):** Per-unit/month with tiered feature access. Free tier for ≤5 units to drive adoption.
- **Feature Gating:** MVP features available on all tiers. Phase 2 (STR, renovation, acquisition) on higher tiers.
- **Usage Metering:** Track units managed, transactions processed, API calls to third parties.

### Technical Architecture Considerations

- **API-First Design:** All functionality accessible via REST API. Web and mobile clients consume the same API.
- **Real-Time Updates:** WebSocket connections for dashboard metrics, work order status changes, and chat messages.
- **Mobile-First for Field Roles:** Maintenance, cleaning, and inspection roles require native or PWA mobile experience optimized for field use.
- **Offline Capability:** Maintenance and inspection workflows must function offline with automatic sync.

### Implementation Considerations

- **Onboarding Funnel:** Guided setup wizard — connect bank account, add first property, invite first tenant. Time to value < 30 minutes.
- **Data Migration:** CSV import templates matching Buildium, AppFolio, Stessa export formats. White-glove migration support for early adopters.
- **Integration Marketplace (Future):** Plugin architecture for third-party integrations beyond core (smart locks, IoT sensors, CRM tools).

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Vertical slice — deliver the complete daily experience for an owner-operator managing long-term rentals. An operator can manage properties, collect rent, handle maintenance, track finances, and share basic reports with investors. The MVP must be BETTER at the daily operations workflow than any individual tool, even if it doesn't yet cover STR, renovation, or acquisition.

**Resource Requirements:** Full-stack team of 4-6 engineers, 1 product designer, 1 PM. Estimated 6 months to production-ready MVP.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:** Owner Morning Check-In (J1), Tenant Maintenance Request (J2), Maintenance Tech Work Day (J3), Investor Quarterly Review (J5 — basic).

**Must-Have Capabilities:**

- Property & unit CRUD with address, photos, unit details, lease information
- Financial engine: chart of accounts, bank feed (Plaid), AI transaction categorization, P&L per property, multi-entity support
- Dashboard: portfolio metrics, daily action feed, configurable smart alerts
- Tenant portal: rent payment (Stripe — ACH, card), maintenance requests (photo/video), lease document storage, in-app messaging
- Maintenance: work order creation/assignment/tracking, photo documentation, status updates, basic time logging
- Investor portal: returns view (CoC, IRR), document vault, distribution history
- Reporting: portfolio P&L, property P&L, vacancy tracking, rent roll
- Auth: email/password + OAuth, role-based access per matrix above
- Notifications: email + push for critical events (overdue rent, emergency maintenance, alerts)

### Post-MVP Features

**Phase 2 — Full Lifecycle (Months 7–12):**

- STR channel management (Airbnb, Vrbo, Booking.com API sync)
- Auto-scheduled cleaning with checklists and photo verification
- Guest communication (unified inbox, AI auto-response)
- Dynamic pricing integration (PriceLabs/Wheelhouse or native)
- Smart lock integration (August, Schlage, Yale)
- Digital welcome guide for guests
- Renovation project management (budget vs actual, contractor progress portal, photo timeline)
- Material cost tracking with barcode scanning
- Deal pipeline Kanban with deal analysis calculator
- CRM for property leads
- Due diligence checklist engine
- Advanced investor portal (K-1 generation, capital calls, branded reports)
- Vendor performance scoring and preferred status
- Move-in/move-out inspection wizard with side-by-side photo comparison
- Lease renewal automation engine
- Payment plans for tenants

**Phase 3 — Intelligence & Platform (Year 2+):**

- AI deal scoring based on portfolio history
- AI business advisor (monthly insight reports)
- AI guest concierge (multilingual)
- Predictive maintenance via IoT
- Direct booking website builder
- On-demand cleaning marketplace
- Community market intelligence
- White-label SaaS
- GPS routing for technicians
- Offline-first mobile app for field teams

### Risk Mitigation Strategy

**Technical Risks:**
- Multi-tenant data isolation → Use row-level security (RLS) in PostgreSQL from day one; validate with penetration testing.
- Financial accuracy → Double-entry accounting engine with daily reconciliation checks; compare against bank feed data.
- API dependency (Plaid, Stripe, Airbnb) → Abstract behind adapter interfaces; implement circuit breakers and graceful degradation.

**Market Risks:**
- Incumbents add lifecycle features → Speed advantage: ship unified MVP while competitors bolt on acquisitions. Our data model advantage is architectural, not a feature — hard to retrofit.
- Operators resist switching → White-glove migration for first 50 operators. Free tier for small portfolios. Focus on "one-week" onboarding experience.

**Resource Risks:**
- Scope creep → Phase gates enforced. MVP ships with LTR only; STR/renovation delayed to Phase 2 regardless of demand pressure.
- Key engineer departure → Core financial engine and auth well-documented; no single-person dependencies on critical path.

---

## Functional Requirements

### Property Management

- FR1: Owner can create, edit, and archive properties with address, type (STR/LTR/renovation/for-sale), photos, documents, and unit details.
- FR2: Owner can create and manage units within multi-unit properties with individual lease tracking.
- FR3: Owner can assign properties to entities/LLCs for financial separation.
- FR4: Owner can view all properties on a map with color-coded status indicators.
- FR5: System maintains a knowledge base per property (appliance manuals, quirks, contractor contacts, utility accounts).

### Financial Engine

- FR6: System connects to bank accounts via Plaid and auto-imports transactions daily.
- FR7: System suggests transaction categories using AI based on vendor name, amount, and historical patterns.
- FR8: Owner can manually categorize, split, or reassign transactions to properties.
- FR9: System generates real-time P&L per property, per entity, and across the portfolio.
- FR10: System supports double-entry chart of accounts pre-configured for real estate (rental income, maintenance, mortgage interest, depreciation, capital improvements, etc.).
- FR11: System tracks security deposits in compliant trust accounts with reconciliation.
- FR12: System auto-generates 1099 forms for vendors/contractors paid over $600.
- FR13: System supports multiple payment methods for rent collection: ACH, credit/debit card, and digital wallets.
- FR14: System calculates and applies late fees per jurisdiction-specific rules.
- FR15: System splits mortgage payments between principal and interest automatically.

### Dashboard & Alerts

- FR16: Owner sees a command center dashboard showing: total portfolio value, monthly cash flow, occupancy rate, overdue rents, open maintenance tickets, active renovations, upcoming lease expirations.
- FR17: System generates a prioritized daily action feed based on urgency and business impact.
- FR18: Owner can configure alert rules with escalation chains (e.g., rent 3 days late → auto-text tenant → 5 days late → notify owner).
- FR19: System calculates and displays vacancy loss per unit in real-time.
- FR20: Owner can compare properties side-by-side on any metric.

### Tenant Portal

- FR21: Tenant can pay rent via ACH, credit/debit card, or digital wallet with one tap.
- FR22: Tenant can enable auto-pay with configurable payment date.
- FR23: Tenant can split rent payments with roommates.
- FR24: Tenant can submit maintenance requests with photos, video, urgency level, and description.
- FR25: Tenant can track maintenance request status in real-time.
- FR26: Tenant can rate completed maintenance jobs.
- FR27: Tenant can view current lease, addenda, move-in inspection photos, and all related documents.
- FR28: Tenant can e-sign lease renewals and addenda.
- FR29: Tenant can message property manager with read receipts and file attachments.
- FR30: Tenant can trigger emergency escalation that bypasses normal communication queue.
- FR31: Tenant can view payment history and download receipts.
- FR32: Tenant can request a payment plan for financial hardship situations.

### Maintenance Operations

- FR33: System creates work orders from tenant requests, inspections, cleaning damage reports, and manual owner creation.
- FR34: Owner/PM can assign work orders to internal technicians or external vendors.
- FR35: Work orders display: property, unit, issue description, tenant photos, access instructions, asset history, priority level.
- FR36: Technician can update work order status, add notes, and upload before/after photos with GPS and timestamp metadata.
- FR37: Technician can log time per work order with separate travel and work time tracking.
- FR38: Technician can scan barcodes/receipts to log parts expenses to the correct property.
- FR39: System supports preventive maintenance schedules (recurring tasks by property, asset, and season).
- FR40: System tracks assets per unit (HVAC, water heater, appliances) with warranty dates and service history.
- FR41: System works offline for field operations and syncs when connectivity is restored.

### Investor Portal

- FR42: Investor can view: total invested, current estimated value, IRR, cash-on-cash return, equity multiple, and distribution history.
- FR43: Investor can see full P&L for properties they are invested in.
- FR44: Investor can access all investment documents (operating agreements, closing statements, insurance, appraisals).
- FR45: System auto-generates K-1-equivalent tax documents. (Phase 2)
- FR46: Owner can send capital calls to investors with deal packages for review and commitment. (Phase 2)
- FR47: System tracks distribution payments with type classification (return of capital vs profit).

### Short-Term Rental Operations (Phase 2)

- FR48: System syncs calendars, rates, and availability with Airbnb, Vrbo, and Booking.com in real-time.
- FR49: System auto-generates cleaning tasks triggered by guest check-out with time window calculation.
- FR50: Cleaning team completes room-by-room digital checklists with photo verification.
- FR51: Cleaning team can report damage with photos, auto-creating a maintenance ticket and guest damage claim.
- FR52: System tracks supply inventory per property with low-stock alerts and auto-generated shopping lists.
- FR53: System delivers unique smart lock codes per guest, time-windowed to their stay.
- FR54: System provides a digital welcome guide per property with WiFi, rules, local recommendations.
- FR55: System supports AI-powered guest communication (auto-responses, multilingual, sentiment detection). (Phase 3)
- FR56: System integrates with dynamic pricing engines or provides native rate optimization. (Phase 3)

### Renovation Management (Phase 2)

- FR57: Owner can create renovation projects per property with budget, phases, and timeline.
- FR58: System tracks budget vs actual spend per line item with overrun alerts.
- FR59: Contractors upload daily progress photos visible in a timeline view.
- FR60: System supports milestone-based payment triggers (framing complete → release 25%).
- FR61: System builds a historical cost-per-square-foot database from completed renovations.
- FR62: System tracks ROI per renovation component (kitchen, bathroom, flooring, etc.).

### Acquisition Pipeline (Phase 2)

- FR63: Owner can manage deal pipeline on a Kanban board: Lead → Analyzing → Under Contract → Due Diligence → Closing → Owned.
- FR64: System provides deal analysis: ROI, cap rate, cash-on-cash, ARV using market data and operator's historical renovation costs.
- FR65: System auto-generates due diligence checklists with contingency deadline tracking.
- FR66: System scores deals 1–100 based on operator's portfolio performance history. (Phase 3)

### Property Disposition (Phase 2)

- FR67: Owner can generate a seller's package from the property's full operational history (P&L, rent history, maintenance log, renovation costs, photos).
- FR68: System tracks buyer inquiries and offer management.
- FR69: System provides AI-estimated property valuation using operational data plus market comps. (Phase 3)

### Vendor Management

- FR70: Vendors receive job notifications with scope, photos, and address. Can accept/decline and submit estimates.
- FR71: Vendors submit invoices in-app or via photo capture. Track approval and payment status.
- FR72: System calculates vendor performance scores (response time, quality ratings, completion rate).
- FR73: High-performing vendors earn preferred status with priority job access.

### Communication

- FR74: System provides property-centric communication channels with threading, search, and file sharing.
- FR75: System supports multi-language content (English, Spanish, Hebrew as initial set).
- FR76: System provides emergency protocol activation with pre-configured playbooks (auto-notify tenants, dispatch contractors, contact insurance).

---

## Non-Functional Requirements

### Performance

- NFR1: Dashboard page load time < 2 seconds for portfolios up to 100 properties.
- NFR2: Search results return in < 500ms across all entities (properties, tenants, transactions, work orders).
- NFR3: Bank feed sync processes up to 1,000 transactions within 5 minutes.
- NFR4: Real-time notifications delivered within 3 seconds of triggering event.
- NFR5: Concurrent support for 50 active users per tenant without degradation.

### Security

- NFR6: All data encrypted at rest (AES-256) and in transit (TLS 1.3).
- NFR7: Authentication via email/password with MFA option. OAuth2 for SSO.
- NFR8: Row-level security (RLS) enforcing tenant isolation at the database level.
- NFR9: Role-based access control enforced on both API and UI layers.
- NFR10: PCI DSS compliance via Stripe — no raw payment data stored in application.
- NFR11: Immutable audit log for all financial transactions and sensitive data changes.
- NFR12: Automated vulnerability scanning in CI/CD pipeline.
- NFR13: Session management: configurable timeout, device tracking, forced logout capability.

### Scalability

- NFR14: Architecture supports horizontal scaling to 10,000+ operators without re-architecture.
- NFR15: Database design supports 1M+ properties across all tenants.
- NFR16: File storage (photos, documents) via cloud object storage (S3-compatible) with CDN delivery.
- NFR17: Background job processing (bank sync, report generation, notifications) via job queue with retry logic.

### Accessibility

- NFR18: WCAG 2.1 AA compliance for all web interfaces.
- NFR19: Mobile interfaces must support screen readers and dynamic text sizing.
- NFR20: Color-coded indicators must have non-color alternatives (icons, text labels).

### Integration

- NFR21: RESTful API with OpenAPI 3.0 specification for all public endpoints.
- NFR22: Webhook support for external integrations to subscribe to events.
- NFR23: Plaid integration for bank feeds with support for 10,000+ financial institutions.
- NFR24: Stripe integration for payment processing with support for ACH, cards, and digital wallets.
- NFR25: OAuth2-based third-party authorization for channel manager, smart lock, and accounting integrations.
- NFR26: Export capabilities: CSV, PDF, and QuickBooks-compatible formats for all financial data.

### Reliability

- NFR27: 99.9% uptime SLA for core services (rent collection, dashboard, maintenance).
- NFR28: Automated database backups every 6 hours with 30-day retention and point-in-time recovery.
- NFR29: Graceful degradation when third-party services are unavailable (bank feeds, payment processor, channel APIs).
- NFR30: Offline capability for mobile field operations with conflict resolution on sync.

---

*End of PRD — Casa Meni v1.0*
