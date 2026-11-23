# Automotive Conversion Roadmap

This roadmap sets scope and acceptance criteria. It does not assert that features are implemented.

## Phase 0 — Baseline and protections (before feature merges)

- [ ] Confirm fork CI passes against exact branch SHA: TypeScript typecheck, application/API tests, DB tests, build, browser/e2e, upgrade path, and Docker instance smoke tests.
- [ ] Inspect current PostgreSQL schema, RLS policies, role guards and CRUD patterns before designing migrations.
- [ ] Record reusable domain services and screen components. Document any proposed changes to existing interfaces.
- [ ] Verify protected owner bootstrap: an uninitialized publicly exposed instance must not be claimable by an unrelated first visitor. Require an atomic, single-use instance provisioning secret / equivalent controlled flow.
- [ ] Make rate limiting fail closed for security-sensitive sign-in and recovery paths on accounting failures, with safe user-facing errors and tests; investigate public-upload byte budgets failing open on database errors.
- [ ] Implement and rehearse offsite recovery of database, uploaded photos/documents and necessary secrets. Test restore, not merely backup creation.
- [ ] Establish secure test environment and synthetic role matrix. No credentials, payments or real customer records in fixtures.
- [ ] Preserve upstream LICENSE and NOTICE, and choose legally compliant differentiation/branding.
- [ ] Define release evidence, migration rollback, observability and safe customer support boundaries.

**Gate:** Automated baseline green; high-risk security/restore gaps understood and corrected or explicitly blocking any live pilot.

## Phase 1 — Automotive vehicle foundation

- [ ] Customer-linked vehicles with stable IDs and historical ownership semantics.
- [ ] VIN, year, make, model, engine/trim (optional and evidence-based), license plate, odometer with units and recorded-at time.
- [ ] Optional NHTSA vPIC decode through a server-side adapter; network failures cannot prevent manual entry; respect service usage limits.
- [ ] Vehicle list/search, add/view/edit screens in existing layout; responsive/mobile and keyboard/screen-reader accessible.
- [ ] Permission and cross-company data isolation: API/DB policy + negative authenticated tests.
- [ ] Non-destructive migration and rollback test using fixtures representative of existing installations.
- [ ] Unit, API, DB/RLS, browser and accessibility tests.

**Gate:** Create, inspect and edit a synthetic vehicle linked to an existing customer; cannot read another company's vehicles; old customer/job workflows unchanged.

## Phase 2 — Repair operations MVP

- [ ] Repair order model linked to customer, vehicle and existing job lifecycle, with explicit state transitions and audit history.
- [ ] Concerns, diagnosis notes, technician assignments, time spent and parts/labor lines.
- [ ] Automotive estimates with authorized changes, tax/discount integration and unique idempotency keys for financial writes.
- [ ] Digital inspection templates, notes, photos and customer recommendations.
- [ ] Customer authorization recording: who, what version, when, with documented approval scope.
- [ ] Service history populated from completed repair work, not fabricated recommendations.
- [ ] Parts as job inputs initially; defer full supplier catalog and POS replacement.
- [ ] Test concurrent edits, double submissions, interrupted sync, role revocation and safe error recovery.

**Gate:** End-to-end synthetic journey from intake to estimate authorization, technician work, invoice and payment; no duplicate charges or unauthorized work orders.

## Phase 3 — Usability and pilot readiness

- [ ] Dedicated service advisor dashboard, shop calendar, technician mobile view and customer approval flow.
- [ ] Empty/loading/error states, undo/cancel controls, plain language and accessibility.
- [ ] Offline behavior must clearly distinguish queued-on-device from confirmed-server actions; test retries and conflicts.
- [ ] Monitor errors and payment events without logging PII, secrets or complete payment details.
- [ ] Acceptance with real shop operators using synthetic records; document usability findings.
- [ ] Cross-browser coverage, including desktop Chromium plus targeted Firefox/WebKit and real-device smoke testing.
- [ ] Supply-chain, dependency, static analysis and secret scanning; CI evidence recorded.

**Gate:** Pilot-ready only after security, disaster recovery, billing correctness, tenant isolation, UI accessibility and monitored deployment gates pass.

## Phase 4 — SaaS business operations (after MVP evidence)

- [ ] Central control plane for managed separate customer instances: secure provisioning, domains, secrets, lifecycle and upgrades.
- [ ] Subscription billing with webhook authentication, idempotency, retry/reconciliation and clear entitlement state; no accidental cut-off during webhook outages.
- [ ] Trial/onboarding, cancellation, export and deletion workflows with documented retention choices.
- [ ] Usage metering and cost telemetry for hosting, storage, SMS, payment services and support.
- [ ] Restore and versioned upgrade rehearsal for multiple isolated customer instances.
- [ ] Paid pilot: 2–3 customers; track onboarding time, activation, real usage, retention, support burden and per-customer contribution.

**Gate:** No broad public launch until multiple customer pilots function with proven restores, credible operating economics and incident response.

## Deferred features

Licensed labor guides/OEM procedures, nationwide parts-fitment catalog, commercial supplier integrations, full POS, multi-shop enterprise control, advanced fleet contracts, AI diagnostics, and predictive maintenance. Revisit only with explicit evidence of demand and licenses where required.

## Engineering rules

1. Preserve the upstream application until a replacement is independently verified.
2. Do not bundle security changes and large feature rewrites into an unreviewable release.
3. Keep authorization checks at API and database layers, not only the UI.
4. Any schema change requires forward compatibility, migration test and rollback plan.
5. Any money movement or customer authorization requires idempotency, auditability and concurrency tests.
6. Confirm state on the server before reporting success in the interface.
7. Do not treat passing tests as proof of pentest completion or real-business acceptance.
8. Each milestone output: files changed, migration notes, checks with run IDs, remaining blockers, screenshots where useful, and merge/deploy decision.
