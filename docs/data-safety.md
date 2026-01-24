# Data Safety & Migration Policy

This document outlines the mandatory procedures for handling schema changes to prevent data loss, especially in production environments.

## 1. Zero Data Loss Principle
No schema change should ever result in the deletion of existing user data. If a structural change is required that makes an old state invalid, a **Migration Path** must be designed first.

## 2. Mandatory Pre-Migration Steps
Before applying any Prisma schema changes (`npx prisma db push` or `migrate dev`):
- **Checkpoint**: Take a database snapshot or export critical tables.
- **Dependency Audit**: Identify any new `Required` (non-nullable) fields being added to existing models.

## 3. The "Expand and Contract" Pattern
When making a field required that previously didn't exist or was optional:

1.  **Phase 1: Optional Addition**
    - Add the field to `schema.prisma` as optional (e.g., `facilityId String?`).
    - Apply the change to the database.
2.  **Phase 2: Data Backfill**
    - Run a migration script (like `scripts/migrate-spaces-to-facilities.ts`) to populate the new field for all existing rows.
    - Ensure every row has a valid value.
3.  **Phase 3: Enforce Constraint**
    - Change the field to required in `schema.prisma` (e.g., `facilityId String`).
    - Apply the final schema change.

## 4. Automation
Always include a `seed` or `migration` script in the PR that handles the data transition. Use the `./scripts/production-migration.ts` template for this.
