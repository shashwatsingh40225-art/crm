/**
 * Seed script (INV-12). `npm run seed`.
 *
 * Produces a database that makes every screen look like a working CRM: one
 * pipeline with seven stages, eight companies, twelve contacts, ten deals with
 * at least one in every stage, ~30 activities, eight tasks including overdue
 * ones, and stage history for every deal.
 *
 * Two clients are used on purpose:
 *   - `raw` (unextended) for the wipe, and for creating users. Deleting through
 *     the audited client would emit delete-AuditEvents for rows that are on
 *     their way out, and the audit rows are wiped anyway.
 *   - `prisma` (audited, from lib/db) for everything else, inside
 *     withActor(shashwat.id) — so the seeded database also demonstrates the
 *     audit trail with a real actor rather than leaving audit_events empty.
 */
import "dotenv/config";
import { PrismaClient, type StageKey } from "@prisma/client";
import { prisma } from "../lib/db";
import { withActor } from "../lib/audit";
import { SEED_COMPANIES, SEED_USERS } from "./seed-data";

const raw = new PrismaClient();

/** Days before now, as a Date. */
const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const daysAhead = (n: number, hour = 10) => daysAgo(-n, hour);

const STAGES: { key: StageKey; name: string; probability: number }[] = [
  { key: "scanned", name: "Scanned", probability: 5 },
  { key: "qualified", name: "Qualified", probability: 15 },
  { key: "contacted", name: "Contacted", probability: 25 },
  { key: "engaged", name: "Engaged", probability: 40 },
  { key: "evaluating", name: "Evaluating", probability: 60 },
  { key: "proposal", name: "Proposal", probability: 80 },
  { key: "closed", name: "Won / Lost", probability: 100 },
];

const MRR = { starter: "99.00", professional: "299.00", enterprise: "999.00" };

async function wipe() {
  // Order matters: children before parents.
  await raw.auditEvent.deleteMany();
  await raw.task.deleteMany();
  await raw.activity.deleteMany();
  await raw.stageEvent.deleteMany();
  await raw.finding.deleteMany();
  await raw.deal.deleteMany();
  await raw.contact.deleteMany();
  await raw.company.deleteMany();
  await raw.stage.deleteMany();
  await raw.pipeline.deleteMany();
  await raw.user.deleteMany();
}

async function main() {
  console.log("Wiping…");
  await wipe();

  console.log("Users…");
  const users = [];
  for (const u of SEED_USERS) {
    users.push(await raw.user.create({ data: u }));
  }
  const [shashwat, rhea, daniel] = users;

  // Everything below is attributed to Shashwat in the audit trail.
  await withActor(shashwat.id, async () => {
    console.log("Pipeline and stages…");
    const pipeline = await prisma.pipeline.create({
      data: { name: "Verena Launch" },
    });

    const stages: Record<string, { id: string }> = {};
    for (const [i, s] of STAGES.entries()) {
      stages[s.key] = await prisma.stage.create({
        data: {
          key: s.key,
          name: s.name,
          position: i + 1,
          probability: s.probability,
          pipelineId: pipeline.id,
        },
      });
    }

    console.log("Companies, contacts, findings…");
    const owners = [shashwat, rhea, daniel];
    const companies: Record<string, { id: string }> = {};
    const contacts: Record<string, { id: string }> = {};

    for (const [i, c] of SEED_COMPANIES.entries()) {
      const owner = owners[i % owners.length];
      const company = await prisma.company.create({
        data: {
          name: c.name,
          domain: c.domain,
          industry: `${c.industry} · ${c.region}`,
          size: c.size,
          source: c.source,
          icpFit: c.icpFit,
          lifecycleStage: c.lifecycleStage,
          ownerId: owner.id,
          createdAt: daysAgo(60 - i * 5),
        },
      });
      companies[c.name] = company;

      for (const ct of c.contacts) {
        contacts[ct.email] = await prisma.contact.create({
          data: {
            name: ct.name,
            email: ct.email,
            title: ct.title,
            phone: ct.phone,
            lifecycleStage: ct.lifecycleStage,
            companyId: company.id,
            ownerId: owner.id,
          },
        });
      }

      for (const f of c.findings) {
        await prisma.finding.create({
          data: {
            companyId: company.id,
            framework: f.framework,
            observation: f.observation,
            evidenceUrl: f.evidenceUrl,
            confidence: f.confidence,
            reviewedById: owner.id,
            reviewedAt: daysAgo(55 - i * 4),
          },
        });
      }
    }

    /**
     * Ten deals, at least one per stage. Gate fields are populated to match the
     * stage each deal actually sits in — a deal in Proposal carries
     * proposedTier/proposedMrr, one still in Scanned carries none of it. The
     * board is therefore consistent with the server-side gate from the start.
     *
     * `staleDays` drives the most recent activity, so the stalled-deal widget
     * (INV-32/INV-41) has real data: two deals are 12 and 16 days quiet.
     */
    const dealSpecs = [
      {
        name: "Meridian Outfitters — Verena Professional",
        company: "Meridian Outfitters",
        contact: "dana.whitfield@meridianoutfitters.example",
        stage: "proposal" as StageKey,
        source: "outbound_scan" as const,
        owner: shashwat,
        lastOutreachAt: daysAgo(9),
        verenaPlanInterest: "professional" as const,
        proposedTier: "professional" as const,
        proposedMrr: MRR.professional,
        nextAction: "Chase signature on the Professional proposal",
        nextActionDue: daysAhead(2),
        staleDays: 12, // stale
        history: ["scanned", "qualified", "contacted", "engaged", "evaluating", "proposal"],
      },
      {
        name: "Solvent & Co. — Verena Enterprise",
        company: "Solvent & Co.",
        contact: "b.devries@solventco.example",
        stage: "proposal" as StageKey,
        source: "outbound_scan" as const,
        owner: daniel,
        lastOutreachAt: daysAgo(6),
        verenaPlanInterest: "enterprise" as const,
        proposedTier: "enterprise" as const,
        proposedMrr: MRR.enterprise,
        nextAction: "Legal review of DPA before signature",
        nextActionDue: daysAhead(5),
        staleDays: 3,
        history: ["scanned", "qualified", "contacted", "engaged", "evaluating", "proposal"],
      },
      {
        name: "Copperleaf Interiors — Verena Starter",
        company: "Copperleaf Interiors",
        contact: "priya@copperleafinteriors.example",
        stage: "evaluating" as StageKey,
        source: "outbound_scan" as const,
        owner: rhea,
        lastOutreachAt: daysAgo(11),
        verenaPlanInterest: "starter" as const,
        nextAction: "Send Starter vs Professional comparison",
        nextActionDue: daysAhead(1),
        staleDays: 16, // stale
        history: ["scanned", "qualified", "contacted", "engaged", "evaluating"],
      },
      {
        name: "Brightpath Tutoring — Verena Professional",
        company: "Brightpath Tutoring",
        contact: "nadia@brightpathtutoring.example",
        stage: "evaluating" as StageKey,
        source: "inbound_signup" as const,
        owner: shashwat,
        lastOutreachAt: daysAgo(4),
        verenaPlanInterest: "professional" as const,
        nextAction: "Walk through WCAG report on Thursday",
        nextActionDue: daysAhead(3),
        staleDays: 2,
        // Inbound: enters at Engaged, skips Scanned and Contacted (CLAUDE.md §4).
        history: ["engaged", "evaluating"],
      },
      {
        name: "Northgate Fitness — Verena Professional",
        company: "Northgate Fitness Collective",
        contact: "a.brennan@northgatefitness.example",
        stage: "engaged" as StageKey,
        source: "outbound_scan" as const,
        owner: rhea,
        lastOutreachAt: daysAgo(5),
        nextAction: "Book the cookie-consent walkthrough",
        nextActionDue: daysAhead(4),
        staleDays: 5,
        history: ["scanned", "qualified", "contacted", "engaged"],
      },
      {
        name: "Larkspur Travel — Verena Starter",
        company: "Larkspur Travel Group",
        contact: "cian@larkspurtravel.example",
        stage: "engaged" as StageKey,
        source: "inbound_signup" as const,
        owner: daniel,
        lastOutreachAt: daysAgo(3),
        nextAction: "Confirm which of the three sites is in scope",
        nextActionDue: daysAhead(1),
        staleDays: 1,
        history: ["engaged"],
      },
      {
        name: "Meridian Outfitters — EU storefront expansion",
        company: "Meridian Outfitters",
        contact: "marcus.bell@meridianoutfitters.example",
        stage: "contacted" as StageKey,
        source: "outbound_scan" as const,
        owner: shashwat,
        lastOutreachAt: daysAgo(2),
        staleDays: 2,
        history: ["scanned", "qualified", "contacted"],
      },
      {
        name: "Quarry Lane Realty — listings accessibility",
        company: "Quarry Lane Realty",
        contact: "elena.marsh@quarrylanerealty.example",
        stage: "qualified" as StageKey,
        source: "referral" as const,
        owner: rhea,
        staleDays: 6,
        history: ["scanned", "qualified"],
      },
      {
        name: "Tidewater Provisions — Verena Starter",
        company: "Tidewater Provisions",
        contact: "ruth@tidewaterprovisions.example",
        stage: "scanned" as StageKey,
        source: "outbound_scan" as const,
        owner: daniel,
        staleDays: 20,
        history: ["scanned"],
      },
      {
        name: "Quarry Lane Realty — Verena Professional",
        company: "Quarry Lane Realty",
        contact: "elena.marsh@quarrylanerealty.example",
        stage: "closed" as StageKey,
        source: "referral" as const,
        owner: shashwat,
        lastOutreachAt: daysAgo(30),
        verenaPlanInterest: "professional" as const,
        proposedTier: "professional" as const,
        proposedMrr: MRR.professional,
        outcome: "won" as const,
        closedAt: daysAgo(21),
        staleDays: 21,
        history: ["scanned", "qualified", "contacted", "engaged", "evaluating", "proposal", "closed"],
      },
      {
        name: "Northgate Fitness — Enterprise upgrade",
        company: "Northgate Fitness Collective",
        contact: "t.alderton@northgatefitness.example",
        stage: "closed" as StageKey,
        source: "outbound_scan" as const,
        owner: daniel,
        lastOutreachAt: daysAgo(40),
        verenaPlanInterest: "enterprise" as const,
        proposedTier: "enterprise" as const,
        proposedMrr: MRR.enterprise,
        outcome: "lost" as const,
        lostReason: "Chose an in-house remediation sprint for this budget cycle",
        closedAt: daysAgo(28),
        staleDays: 28,
        history: ["scanned", "qualified", "contacted", "engaged", "evaluating", "proposal", "closed"],
      },
    ];

    console.log("Deals and stage history…");
    const deals: { id: string; spec: (typeof dealSpecs)[number] }[] = [];

    for (const spec of dealSpecs) {
      const deal = await prisma.deal.create({
        data: {
          name: spec.name,
          companyId: companies[spec.company].id,
          primaryContactId: contacts[spec.contact].id,
          stageId: stages[spec.stage].id,
          source: spec.source,
          ownerId: spec.owner.id,
          lastOutreachAt: spec.lastOutreachAt,
          verenaPlanInterest: spec.verenaPlanInterest,
          proposedTier: spec.proposedTier,
          proposedMrr: spec.proposedMrr,
          nextAction: spec.nextAction,
          nextActionDue: spec.nextActionDue,
          outcome: spec.outcome,
          lostReason: spec.lostReason,
          closedAt: spec.closedAt,
          createdAt: daysAgo(45),
        },
      });
      deals.push({ id: deal.id, spec });

      // Append-only stage history, one row per transition, oldest first.
      const hist = spec.history as StageKey[];
      let from: string | null = null;
      for (const [i, key] of hist.entries()) {
        await prisma.stageEvent.create({
          data: {
            dealId: deal.id,
            fromStageId: from,
            toStageId: stages[key].id,
            changedById: spec.owner.id,
            changedAt: daysAgo(45 - i * 6),
          },
        });
        from = stages[key].id;
      }
    }

    console.log("Activities…");
    const ACTIVITY_TEMPLATES = [
      { type: "email" as const, subject: "Sent scan summary and WCAG findings" },
      { type: "email" as const, subject: "Followed up on the findings summary" },
      { type: "call" as const, subject: "Intro call — current remediation process" },
      { type: "meeting" as const, subject: "Walkthrough of the Verena dashboard" },
      { type: "note" as const, subject: "Budget sits with the marketing team, not IT" },
      { type: "demo" as const, subject: "Demoed continuous monitoring and alerts" },
      { type: "note" as const, subject: "Asked for a DPA before any trial" },
      { type: "email" as const, subject: "Sent Starter vs Professional comparison" },
    ];

    let activityCount = 0;
    for (const { id, spec } of deals) {
      const companyId = companies[spec.company].id;
      const contactId = contacts[spec.contact].id;

      // Most recent activity is `staleDays` old — this is what makes the
      // stalled-deal widget meaningful.
      const offsets = [spec.staleDays, spec.staleDays + 7, spec.staleDays + 15];

      for (const [i, off] of offsets.entries()) {
        const t = ACTIVITY_TEMPLATES[(activityCount + i) % ACTIVITY_TEMPLATES.length];
        await prisma.activity.create({
          data: {
            type: t.type,
            subject: t.subject,
            body:
              i === 0
                ? `Latest touchpoint on ${spec.name}. ${spec.nextAction ?? "No next action set."}`
                : null,
            companyId,
            contactId,
            dealId: id,
            occurredAt: daysAgo(off, 9 + i),
            createdById: spec.owner.id,
          },
        });
        activityCount++;
      }
    }

    // Signup activities for the inbound companies, with no deal attached yet.
    for (const c of SEED_COMPANIES.filter((x) => x.source === "inbound_signup")) {
      await prisma.activity.create({
        data: {
          type: "signup",
          subject: "Self-serve signup on verena.ai",
          body: `${c.name} created a Verena account and ran a first scan.`,
          companyId: companies[c.name].id,
          contactId: contacts[c.contacts[0].email].id,
          occurredAt: daysAgo(25),
          createdById: shashwat.id,
        },
      });
      activityCount++;
    }

    console.log("Tasks…");
    const taskSpecs = [
      { title: "Chase Meridian signature", due: -3, owner: shashwat, deal: 0 },
      { title: "Send Copperleaf the tier comparison", due: -1, owner: rhea, deal: 2 },
      { title: "Review Solvent & Co. DPA redlines", due: 1, owner: daniel, deal: 1 },
      { title: "Prep Brightpath WCAG walkthrough", due: 2, owner: shashwat, deal: 3 },
      { title: "Book Northgate cookie-consent session", due: 4, owner: rhea, deal: 4 },
      { title: "Confirm Larkspur site scope", due: 0, owner: daniel, deal: 5 },
      { title: "Re-scan Quarry Lane listings pages", due: 6, owner: rhea, deal: 7 },
      {
        title: "Write up Northgate loss reason for the retro",
        due: -6,
        owner: daniel,
        deal: 10,
        completed: true,
      },
    ];

    for (const t of taskSpecs) {
      const d = deals[t.deal];
      await prisma.task.create({
        data: {
          title: t.title,
          dueDate: t.due < 0 ? daysAgo(-t.due) : daysAhead(t.due),
          ownerId: t.owner.id,
          dealId: d.id,
          companyId: companies[d.spec.company].id,
          completedAt: t.completed ? daysAgo(2) : null,
        },
      });
    }

    console.log(`  ${activityCount} activities written`);
  });

  // --- summary --------------------------------------------------------------
  const counts = {
    users: await raw.user.count(),
    companies: await raw.company.count(),
    contacts: await raw.contact.count(),
    findings: await raw.finding.count(),
    pipelines: await raw.pipeline.count(),
    stages: await raw.stage.count(),
    deals: await raw.deal.count(),
    stageEvents: await raw.stageEvent.count(),
    activities: await raw.activity.count(),
    tasks: await raw.task.count(),
    auditEvents: await raw.auditEvent.count(),
  };
  console.log("\nSeeded:", counts);

  const perStage = await raw.stage.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { deals: true } } },
  });
  console.log("Deals per stage:");
  for (const s of perStage) {
    console.log(`  ${s.position}. ${s.name.padEnd(12)} ${s._count.deals}`);
  }

  const overdue = await raw.task.count({
    where: { completedAt: null, dueDate: { lt: new Date() } },
  });
  console.log(`Overdue open tasks: ${overdue}`);
}

main()
  .catch((e) => {
    console.error("SEED FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await raw.$disconnect();
    await prisma.$disconnect();
  });
