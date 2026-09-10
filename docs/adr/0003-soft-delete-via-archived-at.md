# ADR 0003: Records are removed by setting `archivedAt`, not by deleting rows

Phase 2 lets people remove Companies, Contacts and Deals. Removal sets `archivedAt` on the row (added in INV-48); the row itself is never deleted. No route calls `delete` or `deleteMany` on these three models.

The schema configures `onDelete: Cascade` throughout. Contacts, Deals, Activities, Tasks and Findings cascade from their Company; Activities, Tasks and StageEvents cascade from their Deal. A hard delete of one Company therefore silently takes its contacts, deals, activities, tasks and findings with it — including every deal's StageEvent history, which is meant to be append-only. This is a shared team database: one wrong click destroys someone else's work, and nothing in the UI says how much went with it.

**Rejected: hard delete, relying on the audit table's `before` snapshots for recovery.** Reconstructing a cascade from audit rows is a manual rebuild, not a restore — find every affected row, re-insert in dependency order, re-link the foreign keys. It is also worse than it sounds: the cascade runs inside Postgres, not through Prisma, so the audit extension in `lib/audit.ts` only ever sees the top-level delete. The cascaded children leave no AuditEvent at all, and there is nothing to rebuild them from.
