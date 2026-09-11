import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { normalizeDomain } from "../normalize-domain";
import { signupPayloadSchema } from "./schema";

/**
 * INV-62 - Verena signup ingest. The inbound door: a self-serve signup
 * creates a Company, Contact and Deal in one shot, with the Deal entering
 * the pipeline directly at Engaged (D3 / CLAUDE.md section 4) - it skips
 * Scanned and Contacted, and deliberately skips INV-61's review gate too.
 *
 * That asymmetry with the scan webhook is intentional, not an oversight: a
 * scan's findings are a machine's guess about a prospect that has never
 * heard of Verena, and a human confirms fit before any outreach happens. A
 * signup is a real person who already chose to create a Verena account -
 * there is no machine judgment to check before a human acts on it, and
 * gating it would just delay a warm lead re-confirming a decision the
 * prospect already made. Do not add a review step here to "match" INV-61.
 *
 * Audit extension carries the actor through AsyncLocalStorage, which is lost
 * on Edge (CLAUDE.md section 5) - pinned to Node like every mutating route.
 */
export const runtime = "nodejs";

/**
 * Machine-to-machine auth, not a Supabase session - same scheme as the scan
 * webhook (app/api/webhooks/scan/route.ts), but a separate secret so one can
 * be rotated without the other.
 */
function isAuthorized(request: Request): boolean {
  const expected = process.env.SIGNUP_WEBHOOK_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const provided = header.slice("Bearer ".length);
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: Request) {
  // Checked, and failed, before the body is even read.
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = signupPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { email, name, company_name, domain, plan_interest } = parsed.data;
  const normalizedDomain = domain ? normalizeDomain(domain) : null;

  const engagedStage = await prisma.stage.findFirst({ where: { key: "engaged" } });
  if (!engagedStage) {
    return Response.json({ error: "Pipeline is not seeded" }, { status: 500 });
  }

  // No human triggered this request - same deliberate null actor as INV-60's
  // scan webhook (CLAUDE.md section 5 / section 7).
  const result = await withActor(null, async () => {
    // Reuse by domain when given, else by name (same archivedAt: null policy
    // as the scan webhook - an archived company doesn't get silently
    // resurrected by a new signup). Not both: if a domain is given and
    // doesn't match, this is a new company, even if the name happens to
    // collide with something else.
    let company = normalizedDomain
      ? await prisma.company.findFirst({
          where: { domain: normalizedDomain, archivedAt: null },
        })
      : await prisma.company.findFirst({
          where: { name: { equals: company_name, mode: "insensitive" }, archivedAt: null },
        });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: company_name,
          domain: normalizedDomain,
          source: "inbound_signup",
          // lifecycleStage takes the schema default: prospect.
        },
      });
    }
    // If an existing (e.g. outbound-scanned) Company is reused, its `source`
    // is left as-is - that field records how the COMPANY was first
    // discovered, which this signup doesn't change, even though the new
    // Deal below is unambiguously an inbound_signup Deal.

    // Contact idempotency: same email at the same company is the same
    // person. Case-insensitive, matching the email schema's own
    // normalization.
    let contact = await prisma.contact.findFirst({
      where: { companyId: company.id, email: { equals: email, mode: "insensitive" } },
    });
    const isNewContact = !contact;

    if (!contact) {
      contact = await prisma.contact.create({
        data: { companyId: company.id, name, email },
      });
    }

    // Deal idempotency: an OPEN inbound_signup Deal for this company already
    // means "this company is in the pipeline via self-serve" - a second
    // signup (a retry, or a different person at the same company) doesn't
    // open a second one. Scoped to source: inbound_signup so an existing
    // outbound-motion Deal for the same company (e.g. already Qualified from
    // a scan) doesn't block this door - the two motions share a pipeline,
    // not a single Deal.
    let deal = await prisma.deal.findFirst({
      where: { companyId: company.id, source: "inbound_signup", outcome: null },
    });

    if (!deal) {
      deal = await prisma.deal.create({
        data: {
          name: company.name,
          companyId: company.id,
          primaryContactId: contact.id,
          stageId: engagedStage.id,
          source: "inbound_signup",
          verenaPlanInterest: plan_interest,
        },
      });

      await prisma.stageEvent.create({
        data: {
          dealId: deal.id,
          fromStageId: null,
          toStageId: engagedStage.id,
          changedById: null,
        },
      });
    }

    // Logged once per genuinely new contact - a straight replay (same email,
    // same company) already matched the existing Contact above and creates
    // nothing, including no second Activity. A second person signing up at
    // an already-engaged company still gets one, even though no new Deal is
    // created - it's a real event worth having in the timeline.
    if (isNewContact) {
      await prisma.activity.create({
        data: {
          type: "signup",
          subject: "Signed up for Verena",
          body: plan_interest ? `Interested in the ${plan_interest} plan.` : null,
          companyId: company.id,
          contactId: contact.id,
          dealId: deal.id,
          occurredAt: new Date(),
          createdById: null,
        },
      });
    }

    return { companyId: company.id, contactId: contact.id, dealId: deal.id };
  });

  return Response.json({ data: result }, { status: 201 });
}
