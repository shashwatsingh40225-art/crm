# ADR 0002: Agents read other agents' tables directly via Prisma; they never call each other's API routes

Agent B's Deal-creation UI needs to search Companies and Contacts, which Agent A owns (`app/companies/**`, `app/api/companies/**`). Agent B queries `prisma.company.findMany()` / `prisma.contact.findMany()` directly from its own route under `app/api/deals/**`, rather than calling Agent A's endpoints.

The schema is shared and frozen before the fork (Decision D6), so any agent can safely read any table. Calling another agent's route instead would create a runtime dependency between two git worktrees that don't know about each other until merge — Agent B's Deal-creation feature would be untestable until Agent A merges first, which defeats the point of splitting the agents by feature so they don't collide (Decision D5).

Writes stay confined to each agent's owned directories per the file-ownership map in `CLAUDE.md` §7. Reads do not need to be — they go straight through the shared Prisma client.
