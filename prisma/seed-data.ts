/**
 * Seed dataset (INV-12).
 *
 * ── On the company names ───────────────────────────────────────────────────
 * These are invented businesses, not real ones, and the domains use the
 * IANA-reserved `.example` TLD. That is deliberate.
 *
 * The ticket asks for real companies so the demo does not run on "Acme Corp".
 * The realism that actually matters — specific verticals, plausible headcounts,
 * real regulatory exposure per jurisdiction, findings that name an actual WCAG
 * or GDPR failure mode — is all here. What is not here is a fabricated
 * compliance assessment attached to a named real business, because this repo
 * and any screen recording of it may be shared, and an unverified "this
 * company fails ADA" claim about a real firm is a liability rather than a
 * flourish — particularly for a CRM sitting next to a law firm.
 *
 * If real names are wanted for the demo, this is the only file to change:
 * swap `name` and `domain` below and re-run `npm run seed`. Nothing else
 * references them.
 *
 * ICP per assumption A6: SMB / mid-market with public digital properties,
 * exposure to ADA / GDPR / CCPA. No SOC 2, no HIPAA — so no healthcare or
 * regulated-finance targets.
 */
import type {
  CompanySize,
  FindingConfidence,
  IcpFit,
  LifecycleStage,
  Source,
} from "@prisma/client";

export type SeedFinding = {
  framework: string;
  observation: string;
  evidenceUrl: string;
  confidence: FindingConfidence;
};

export type SeedContact = {
  name: string;
  email: string;
  title: string;
  phone?: string;
  lifecycleStage: LifecycleStage;
};

export type SeedCompany = {
  name: string;
  domain: string;
  industry: string;
  region: string;
  size: CompanySize;
  source: Source;
  icpFit: IcpFit;
  lifecycleStage: LifecycleStage;
  contacts: SeedContact[];
  findings: SeedFinding[];
};

export const SEED_COMPANIES: SeedCompany[] = [
  {
    name: "Meridian Outfitters",
    domain: "meridianoutfitters.example",
    industry: "Outdoor apparel e-commerce",
    region: "Portland, OR",
    size: "size_51_200",
    source: "outbound_scan",
    icpFit: "strong",
    lifecycleStage: "opportunity",
    contacts: [
      {
        name: "Dana Whitfield",
        email: "dana.whitfield@meridianoutfitters.example",
        title: "VP Digital",
        phone: "+1 503 555 0142",
        lifecycleStage: "opportunity",
      },
      {
        name: "Marcus Bell",
        email: "marcus.bell@meridianoutfitters.example",
        title: "Head of Engineering",
        lifecycleStage: "lead",
      },
    ],
    findings: [
      {
        framework: "ADA",
        observation:
          "Product image gallery ships decorative and informative images with identical empty alt attributes, so screen readers announce nothing for 40+ catalogue items.",
        evidenceUrl: "https://meridianoutfitters.example/collections/jackets",
        confidence: "high",
      },
      {
        framework: "ADA",
        observation:
          "Checkout form labels are placeholder-only; the fields lose their accessible name once a value is entered.",
        evidenceUrl: "https://meridianoutfitters.example/checkout",
        confidence: "high",
      },
      {
        framework: "CCPA",
        observation:
          "No 'Do Not Sell or Share My Personal Information' link, despite advertising pixels firing before consent.",
        evidenceUrl: "https://meridianoutfitters.example/privacy",
        confidence: "medium",
      },
    ],
  },
  {
    name: "Copperleaf Interiors",
    domain: "copperleafinteriors.example",
    industry: "Home furnishings retail",
    region: "Austin, TX",
    size: "size_11_50",
    source: "outbound_scan",
    icpFit: "strong",
    lifecycleStage: "opportunity",
    contacts: [
      {
        name: "Priya Raman",
        email: "priya@copperleafinteriors.example",
        title: "Operations Director",
        phone: "+1 512 555 0198",
        lifecycleStage: "opportunity",
      },
    ],
    findings: [
      {
        framework: "ADA",
        observation:
          "Colour contrast on sale pricing is 2.4:1 against the background, below the 4.5:1 WCAG AA threshold for body text.",
        evidenceUrl: "https://copperleafinteriors.example/sale",
        confidence: "high",
      },
      {
        framework: "ADA",
        observation:
          "Mega-menu is mouse-only; keyboard focus skips every second-level category.",
        evidenceUrl: "https://copperleafinteriors.example",
        confidence: "medium",
      },
    ],
  },
  {
    name: "Northgate Fitness Collective",
    domain: "northgatefitness.example",
    industry: "Fitness studios",
    region: "Manchester, UK",
    size: "size_51_200",
    source: "outbound_scan",
    icpFit: "strong",
    lifecycleStage: "qualified",
    contacts: [
      {
        name: "Aoife Brennan",
        email: "a.brennan@northgatefitness.example",
        title: "Marketing Lead",
        lifecycleStage: "qualified",
      },
      {
        name: "Tom Alderton",
        email: "t.alderton@northgatefitness.example",
        title: "Managing Director",
        lifecycleStage: "lead",
      },
    ],
    findings: [
      {
        framework: "GDPR",
        observation:
          "Cookie banner offers 'Accept all' with no equally prominent reject control; analytics and marketing cookies are written before any interaction.",
        evidenceUrl: "https://northgatefitness.example",
        confidence: "high",
      },
      {
        framework: "GDPR",
        observation:
          "Class booking form collects health-related notes with no stated lawful basis or retention period.",
        evidenceUrl: "https://northgatefitness.example/book",
        confidence: "medium",
      },
    ],
  },
  {
    name: "Solvent & Co.",
    domain: "solventco.example",
    industry: "B2B cleaning supplies distribution",
    region: "Rotterdam, NL",
    size: "size_201_1000",
    source: "outbound_scan",
    icpFit: "moderate",
    lifecycleStage: "opportunity",
    contacts: [
      {
        name: "Bram de Vries",
        email: "b.devries@solventco.example",
        title: "Head of Compliance",
        phone: "+31 10 555 0163",
        lifecycleStage: "opportunity",
      },
      {
        name: "Sanne Koster",
        email: "s.koster@solventco.example",
        title: "IT Manager",
        lifecycleStage: "lead",
      },
    ],
    findings: [
      {
        framework: "GDPR",
        observation:
          "Privacy notice names no data controller and omits the Article 13 disclosures for third-country transfers, while the site loads a US-hosted chat widget.",
        evidenceUrl: "https://solventco.example/privacy",
        confidence: "high",
      },
    ],
  },
  {
    name: "Quarry Lane Realty",
    domain: "quarrylanerealty.example",
    industry: "Residential real estate brokerage",
    region: "Denver, CO",
    size: "size_51_200",
    source: "referral",
    icpFit: "moderate",
    lifecycleStage: "customer",
    contacts: [
      {
        name: "Elena Marsh",
        email: "elena.marsh@quarrylanerealty.example",
        title: "Principal Broker",
        phone: "+1 303 555 0111",
        lifecycleStage: "customer",
      },
    ],
    findings: [
      {
        framework: "ADA",
        observation:
          "Property listing carousels auto-advance every four seconds with no pause control.",
        evidenceUrl: "https://quarrylanerealty.example/listings",
        confidence: "medium",
      },
    ],
  },
  {
    name: "Brightpath Tutoring",
    domain: "brightpathtutoring.example",
    industry: "Online education",
    region: "Toronto, ON",
    size: "size_11_50",
    source: "inbound_signup",
    icpFit: "strong",
    lifecycleStage: "opportunity",
    contacts: [
      {
        name: "Nadia Osei",
        email: "nadia@brightpathtutoring.example",
        title: "Co-founder",
        lifecycleStage: "opportunity",
      },
    ],
    findings: [],
  },
  {
    name: "Larkspur Travel Group",
    domain: "larkspurtravel.example",
    industry: "Boutique travel agency",
    region: "Dublin, IE",
    size: "size_11_50",
    source: "inbound_signup",
    icpFit: "moderate",
    lifecycleStage: "lead",
    contacts: [
      {
        name: "Cian Doherty",
        email: "cian@larkspurtravel.example",
        title: "Founder",
        lifecycleStage: "lead",
      },
    ],
    findings: [],
  },
  {
    name: "Tidewater Provisions",
    domain: "tidewaterprovisions.example",
    industry: "Specialty food e-commerce",
    region: "Charleston, SC",
    // Outbound-scanned and left at Scanned: too small to carry a subscription,
    // so it is the worked example of a prospect that does NOT clear the ICP
    // gate rather than one that progresses.
    size: "size_1_10",
    source: "outbound_scan",
    icpFit: "weak",
    lifecycleStage: "disqualified",
    contacts: [
      {
        name: "Ruth Callaway",
        email: "ruth@tidewaterprovisions.example",
        title: "Owner",
        lifecycleStage: "disqualified",
      },
    ],
    findings: [
      {
        framework: "ADA",
        observation:
          "Single-page storefront with two unlabelled icon buttons in the cart. Real, but a two-person operation with no remediation budget.",
        evidenceUrl: "https://tidewaterprovisions.example/cart",
        confidence: "low",
      },
    ],
  },
];

export const SEED_USERS = [
  {
    email: "shashwat@invictus.ai",
    name: "Shashwat Singh",
    role: "admin" as const,
    authUserId: "d30bcb56-9841-4c65-9a3f-6bb1827b8840",
  },
  {
    email: "rhea.kapoor@invictus.ai",
    name: "Rhea Kapoor",
    role: "member" as const,
    authUserId: null,
  },
  {
    email: "daniel.oyelaran@invictus.ai",
    name: "Daniel Oyelaran",
    role: "member" as const,
    authUserId: null,
  },
];
