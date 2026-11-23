# Automotive Platform Conversion

**Status:** Initial vehicle implementation committed to draft PR #1; automated, authenticated and browser acceptance remain unverified. No deployments, billing or customer data changes.

## Purpose

Adapt the existing Crewtavo field-service application into an automotive service management platform for mobile mechanics and small independent repair shops. Reuse proven workflows instead of rewriting them. Commercial SaaS operations come after a safe, usable automotive MVP.

## Baseline

- Upstream: [jviars/crewtavo](https://github.com/jviars/crewtavo)
- Fork: [sportsking1119/crewtavo](https://github.com/sportsking1119/crewtavo)
- Preserved default branch: `main`
- Working branch: `feature/automotive-foundation`
- Initial fork base commit: `36987955d11f063b24ab65d92211474d0107242a`
- Development model: isolated changes, explicit migrations, tests, acceptance evidence and review before merges.

## First customer segment

Mobile mechanics and small independent repair businesses. Begin with a complete customer-to-payment repair workflow. Fleet maintenance is a later extension, not a launch prerequisite.

## Reuse before rebuilding

Keep existing customers, scheduling, employee roles, quotes, approvals, invoices, customer portals, mobile/offline operations, reporting and infrastructure where compatible. Introduce vehicle-specific data and workflows alongside existing data rather than destructively renaming or replacing entities.

## First automotive workflow

1. Create or select a customer.
2. Create a vehicle record linked to that customer.
3. Capture concerns, odometer and job intake.
4. Create a repair order with labor and parts lines.
5. Conduct inspection and attach condition notes/photos.
6. Send an estimate for documented customer authorization.
7. Assign work, track completion and changes.
8. Invoice, record payment and retain service history.

## Documents

- [Roadmap and release gates](./ROADMAP.md)
- [Vehicle management implementation specification](./VEHICLE-MVP.md)

## Architecture and safety decisions

- Preserve the existing one-instance-per-business architecture for the MVP. Do not introduce a shared multi-tenant database prematurely.
- Do not activate automatic subscriptions or customer provisioning until owner-claim security, backups, restoration and operations are verified.
- The initial vehicle feature must enforce ownership/membership through server-side controls and database RLS, including negative authorization tests.
- Avoid uploading or importing real customer PII during development; use synthetic data.
- Preserve AGPL-3.0-only licensing, copyright and notices. The original NOTICE restricts using the Crewtavo name and marks to market a modified product. Choose a distinct product identity before release, and review network source-code obligations.
- Do not claim that public VIN decoding provides licensed OEM labor times, repair instructions, or guaranteed parts fitment.
- No production writes, migrations, customer imports, billing, or deployment are authorized by this planning document.

## Working method

For each feature: inspect existing architecture, document dependencies, make a small isolated change, add tests, run relevant checks, verify UI on mobile and desktop, test access boundaries and error paths, and report evidence and remaining risks. Preserve compatibility with existing Crewtavo users until explicitly approved.

## Current milestone

**Milestone 1 in progress:** Vehicle schema and RLS, customer-linked vehicle form, archiving, client deletion guard and unit/database tests are committed. GitHub checks and real runtime verification are still required. Do not merge or deploy until evidence is reviewed.
