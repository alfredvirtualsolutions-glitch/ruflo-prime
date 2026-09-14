/**
 * State pension eligibility rules, expressed as data rather than code.
 *
 * IMPORTANT: these are the publicly documented plan rules as of RULES_AS_OF and
 * they exist here so a non-developer can correct them without touching logic.
 * Plans change. Verify against the member handbook before anything derived from
 * this file is used in client-facing advice. `notes` on each tier records what
 * the encoded rule is meant to represent.
 *
 * Rule kinds understood by the engine:
 *   { kind: "points", value }                 age + years of service >= value
 *   { kind: "pointsWithMinAge", value, minAge } as above, plus a hard age floor
 *   { kind: "age", value }                    age >= value (service floor via minService)
 *   { kind: "ageAndService", age, service }   both thresholds must be met
 *   { kind: "service", value }                years of service >= value, any age
 */

export const RULES_AS_OF = "2026-09-04"

export const PENSION_SYSTEMS = [
  {
    id: "AZ_ASRS",
    state: "AZ",
    system: "ASRS",
    name: "Arizona State Retirement System",
    pointsLabel: "ASRS points",
    tiers: [
      {
        id: "AZ_ASRS_PRE_2011",
        label: "Pre-July 2011 member",
        hiredBefore: "2011-07-01",
        notes: "Normal retirement at 80 points (age + years of service), or 65, or 62 with 10 years, or 60 with 25 years.",
        unreduced: [
          { kind: "points", value: 80 },
          { kind: "age", value: 65, minService: 5 },
          { kind: "ageAndService", age: 62, service: 10 },
          { kind: "ageAndService", age: 60, service: 25 },
        ],
        early: [{ kind: "ageAndService", age: 50, service: 5 }],
      },
      {
        id: "AZ_ASRS_POST_2011",
        label: "On/after July 2011 member",
        hiredFrom: "2011-07-01",
        notes: "Same structure as the pre-2011 tier but the points milestone is 85, not 80.",
        unreduced: [
          { kind: "points", value: 85 },
          { kind: "age", value: 65, minService: 5 },
          { kind: "ageAndService", age: 62, service: 10 },
          { kind: "ageAndService", age: 60, service: 25 },
        ],
        early: [{ kind: "ageAndService", age: 50, service: 5 }],
      },
    ],
  },
  {
    id: "TX_TRS",
    state: "TX",
    system: "TX_TRS",
    name: "Teacher Retirement System of Texas",
    pointsLabel: "TRS points",
    tiers: [
      {
        id: "TX_TRS_TIER_1",
        label: "Tier 1 (member before Sept 2007)",
        hiredBefore: "2007-09-01",
        notes: "Rule of 80 with no minimum age, or age 65 with 5 years of service credit.",
        unreduced: [
          { kind: "points", value: 80 },
          { kind: "age", value: 65, minService: 5 },
        ],
        early: [
          { kind: "ageAndService", age: 55, service: 5 },
          { kind: "service", value: 30 },
        ],
      },
      {
        id: "TX_TRS_TIER_2_4",
        label: "Tiers 2-4 (Sept 2007 - Aug 2014)",
        hiredFrom: "2007-09-01",
        hiredBefore: "2014-09-01",
        notes: "Rule of 80 with a minimum age of 60 for an unreduced annuity, or age 65 with 5 years.",
        unreduced: [
          { kind: "pointsWithMinAge", value: 80, minAge: 60 },
          { kind: "age", value: 65, minService: 5 },
        ],
        early: [
          { kind: "ageAndService", age: 55, service: 5 },
          { kind: "service", value: 30 },
        ],
      },
      {
        id: "TX_TRS_TIER_5_6",
        label: "Tiers 5-6 (on/after Sept 2014)",
        hiredFrom: "2014-09-01",
        notes: "Rule of 80 with a minimum age of 62 for an unreduced annuity, or age 65 with 5 years.",
        unreduced: [
          { kind: "pointsWithMinAge", value: 80, minAge: 62 },
          { kind: "age", value: 65, minService: 5 },
        ],
        early: [
          { kind: "ageAndService", age: 55, service: 5 },
          { kind: "service", value: 30 },
        ],
      },
    ],
  },
  {
    id: "NV_PERS",
    state: "NV",
    system: "NVPERS",
    name: "Nevada Public Employees' Retirement System",
    pointsLabel: "service years",
    tiers: [
      {
        id: "NV_PERS_PRE_2010",
        label: "Regular member before Jan 2010",
        hiredBefore: "2010-01-01",
        notes: "Unreduced at 65 with 5 years, 60 with 10 years, or 30 years at any age.",
        unreduced: [
          { kind: "ageAndService", age: 65, service: 5 },
          { kind: "ageAndService", age: 60, service: 10 },
          { kind: "service", value: 30 },
        ],
        early: [{ kind: "ageAndService", age: 50, service: 10 }],
      },
      {
        id: "NV_PERS_2010_2015",
        label: "Regular member Jan 2010 - Jun 2015",
        hiredFrom: "2010-01-01",
        hiredBefore: "2015-07-01",
        notes: "Unreduced at 65 with 5 years, 62 with 10 years, or 30 years at any age.",
        unreduced: [
          { kind: "ageAndService", age: 65, service: 5 },
          { kind: "ageAndService", age: 62, service: 10 },
          { kind: "service", value: 30 },
        ],
        early: [{ kind: "ageAndService", age: 50, service: 10 }],
      },
      {
        id: "NV_PERS_POST_2015",
        label: "Regular member on/after Jul 2015",
        hiredFrom: "2015-07-01",
        notes: "Unreduced at 65 with 5 years, 62 with 10 years, or 33.33 years at any age.",
        unreduced: [
          { kind: "ageAndService", age: 65, service: 5 },
          { kind: "ageAndService", age: 62, service: 10 },
          { kind: "service", value: 33.33 },
        ],
        early: [{ kind: "ageAndService", age: 50, service: 10 }],
      },
    ],
  },
  {
    id: "CA_CALSTRS",
    state: "CA",
    system: "CalSTRS",
    name: "California State Teachers' Retirement System",
    pointsLabel: "service years",
    appliesToRoles: ["teacher", "certificated"],
    tiers: [
      {
        id: "CA_CALSTRS_2_AT_60",
        label: "2% at 60 (member before Jan 2013)",
        hiredBefore: "2013-01-01",
        notes: "Normal retirement age 60 with 5 years; reduced from 55, or from 50 with 30 years.",
        unreduced: [{ kind: "ageAndService", age: 60, service: 5 }],
        early: [
          { kind: "ageAndService", age: 55, service: 5 },
          { kind: "ageAndService", age: 50, service: 30 },
        ],
      },
      {
        id: "CA_CALSTRS_2_AT_62",
        label: "2% at 62 (member on/after Jan 2013, PEPRA)",
        hiredFrom: "2013-01-01",
        notes: "Normal retirement age 62 with 5 years; reduced from 55.",
        unreduced: [{ kind: "ageAndService", age: 62, service: 5 }],
        early: [{ kind: "ageAndService", age: 55, service: 5 }],
      },
    ],
  },
  {
    id: "CA_CALPERS",
    state: "CA",
    system: "CalPERS",
    name: "California Public Employees' Retirement System (school members)",
    pointsLabel: "service years",
    appliesToRoles: ["classified", "support", "staff"],
    tiers: [
      {
        id: "CA_CALPERS_CLASSIC",
        label: "Classic school member (before Jan 2013)",
        hiredBefore: "2013-01-01",
        notes: "2% at 55 school formula; earliest retirement age 50 with 5 years.",
        unreduced: [{ kind: "ageAndService", age: 55, service: 5 }],
        early: [{ kind: "ageAndService", age: 50, service: 5 }],
      },
      {
        id: "CA_CALPERS_PEPRA",
        label: "PEPRA school member (on/after Jan 2013)",
        hiredFrom: "2013-01-01",
        notes: "2% at 62 PEPRA formula; earliest retirement age 52 with 5 years.",
        unreduced: [{ kind: "ageAndService", age: 62, service: 5 }],
        early: [{ kind: "ageAndService", age: 52, service: 5 }],
      },
    ],
  },
]

/** Systems that could apply to a lead, most specific role match first. */
export function systemsForState(state) {
  const code = String(state ?? "").trim().toUpperCase()
  return PENSION_SYSTEMS.filter((s) => s.state === code)
}

/** Pick the system for a state, disambiguating CA by job role when possible. */
export function resolveSystem(state, role) {
  const candidates = systemsForState(state)
  if (candidates.length <= 1) return candidates[0] ?? null
  const haystack = String(role ?? "").toLowerCase()
  const matched = candidates.find((s) => (s.appliesToRoles ?? []).some((kw) => haystack.includes(kw)))
  return matched ?? candidates[0]
}

/** Pick the tier whose hire-date window contains `hireDate`. */
export function resolveTier(system, hireDate) {
  if (!system) return null
  for (const tier of system.tiers) {
    const from = tier.hiredFrom ? Date.parse(tier.hiredFrom) : -Infinity
    const before = tier.hiredBefore ? Date.parse(tier.hiredBefore) : Infinity
    const t = hireDate ? hireDate.getTime() : NaN
    if (Number.isNaN(t)) continue
    if (t >= from && t < before) return tier
  }
  return null
}

export const SUPPORTED_STATES = Array.from(new Set(PENSION_SYSTEMS.map((s) => s.state))).sort()
