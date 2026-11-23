# First Implementation: Customer-Linked Vehicle Management

**Status:** Initial customer-linked vehicle slice implemented on draft PR #1, unverified by CI/browser. This remains the acceptance specification. NHTSA VIN decode, vehicle service history, and broader repair-order integration are deferred.

## User stories

- As an authorized service advisor, I can register a vehicle against an existing customer without duplicating their contact record.
- As an authorized technician, I can see the relevant vehicle identity and mileage when assigned work, without seeing another business's records.
- As an authorized staff member, I can search vehicles by VIN, plate, customer and vehicle attributes within my company.
- As a customer, I can see only vehicles and service records explicitly associated with my permitted customer portal identity.
- If VIN decoding is unavailable, staff can enter or correct details manually, with a traceable provenance indicator for decoded vs user-entered fields.

## Data model proposal (names are provisional)

Use additive `vehicles` and relationship tables or columns chosen to fit the existing company/customer schema. Do **not** alter or drop current customer/job records in Phase 1.

- `id`: stable UUID primary key.
- `company_id`: owning tenant/instance company identifier, indexed and enforced in RLS.
- `customer_id`: reference to existing customer, validated for same-company membership.
- `vin`: nullable, normalized upper-case, validated to 17 characters when present; avoid overrestrictive uniqueness that blocks historical or shared fleet records; determine actual uniqueness policy from business rules.
- `year`, `make`, `model`, `trim`, `engine`: nullable, editable.
- `license_plate`, `plate_region`: nullable, editable.
- `odometer_value`, `odometer_unit`, `odometer_recorded_at`: nullable, with unit explicit (miles/km); preserve historic readings rather than silently replacing them once Phase 2 needs an odometer timeline.
- `created_at`, `updated_at`; `created_by`/`updated_by` when consistent with upstream audit practices.
- Soft archive or an equivalent safe retention strategy rather than destructive delete after service records exist.

Consider a separate ownership-history association when transferring a vehicle between customers. Never make an existing repair history visible to a new owner without confirming privacy/business requirements. Company isolation must apply to all joins and portal views.

## API and authorization

- Follow the established Hono route, Zod validation, Supabase access, server-side role and Postgres RLS patterns; do not introduce a new framework.
- Build list/detail/create/update/controlled archive operations, pagination, server-side search and consistent error responses.
- Apply company and role scope on every operation and protect foreign keys against cross-tenant references.
- Deny anonymous and non-member access. Handle suspended/revoked roles using the existing permission semantics.
- Write tests proving a user from Company A cannot access, enumerate, update, link or delete Company B's vehicles, even by guessing UUIDs.
- Do not return full VIN, plate or other sensitive records to unrelated users, unscoped logging, or public pages.

## VIN decoding

- Prefer a small server-side service adapter using public NHTSA vPIC data for US vehicles; document limitations and response mapping.
- Apply bounded timeouts, safe caching, per-instance limits and clearly labeled source/accuracy; no guarantee of trim, engine or fitment.
- On timeout, non-US/invalid VIN, API outage or ambiguous model data, keep manual entry available.
- Never call a third-party API on every keypress, and do not log customer identity or raw request payloads.
- Separate vehicle ID from VIN: VIN is an attribute, not a database primary key.

## UX flow

1. Customer record > **Vehicles** > Add vehicle.
2. VIN input (optional) and **Look up** with progress, clear failure and fallback to manual entry.
3. Year/make/model and mileage form, including validation and unit selection.
4. Save with clear server-confirmed success; show vehicle profile and linked customer.
5. View/search/update vehicle across both desktop and phone layouts.
6. Present accessible labels, keyboard navigation, error summaries and pending states.

## Acceptance criteria

- [ ] A permitted user can create and edit vehicle records using existing UI components. (Code committed, awaiting runtime verification.)
- [ ] Duplicate form submissions do not create two records when retries or slow connections occur.
- [ ] Invalid input yields helpful validation; no blank screen or unhandled error.
- [ ] VIN decode outage does not prevent manual vehicle registration.
- [ ] Search and list are strictly tenant scoped.
- [ ] Foreign-key manipulation and revoked-role access are rejected by both API and DB policies.
- [ ] Customer portal visibility is explicitly tested; do not automatically expose records.
- [ ] Database migration upgrades an existing fixture without changing unrelated records. (Migration committed, test not yet run.)
- [ ] Existing customer, jobs, estimates, auth, invoices and payments tests continue passing.
- [ ] Test on phone and desktop; check accessibility and interruption recovery.
- [ ] Build and CI results recorded against the exact final commit SHA.

## First coding sequence

1. Map the existing customer schema, role helpers, RLS conventions, API route structure and test harness.
2. Write a small schema/permission proposal and test matrix for vehicles.
3. Implement additive migration and database security tests.
4. Add API with validation and negative authorization tests.
5. Build simple vehicle screens reusing existing design components.
6. Add VIN lookup adapter and failure-mode tests.
7. Run broader regressions and browser acceptance; summarize evidence and remaining issues.

**Stop/approval boundaries:** Do not deploy, migrate live databases, add external paid services, activate subscription billing, change license/trademarks, or import real customer records as part of this initial implementation.
