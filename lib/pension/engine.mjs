/**
 * Pension signal engine: raw educator lead -> scored, CRM-ready retirement signal.
 *
 * Pure functions only. No I/O, no dates read from the ambient clock unless a
 * caller omits `asOf`, so every run is reproducible and testable.
 */

import { RULES_AS_OF, resolveSystem, resolveTier } from "./rules.mjs"

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000

export const SIGNAL = {
  ELIGIBLE_NOW: "ELIGIBLE_NOW",
  MILESTONE_APPROACHING: "MILESTONE_APPROACHING",
  EARLY_RETIREMENT_CANDIDATE: "EARLY_RETIREMENT_CANDIDATE",
  MILESTONE_WITHIN_5Y: "MILESTONE_WITHIN_5Y",
  MONITOR: "MONITOR",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  UNSUPPORTED_STATE: "UNSUPPORTED_STATE",
}

/** Windows (in years) that decide which signal a lead lands in. Tunable. */
export const DEFAULT_THRESHOLDS = { approaching: 2, nearTerm: 5 }

/* ------------------------------------------------------------------ dates */

/** Parse the date formats that show up in exported educator lists. */
export function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const raw = String(value ?? "").trim()
  if (!raw) return null
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw)
  if (m) return utc(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw)
  if (m) return utc(+m[3], +m[1], +m[2])
  m = /^(\d{4})$/.exec(raw)
  if (m) return utc(+m[1], 7, 1) // year only: assume mid-year so we never overstate age
  const parsed = Date.parse(raw)
  return Number.isNaN(parsed) ? null : new Date(parsed)
}

function utc(y, mo, d) {
  const date = new Date(Date.UTC(y, mo - 1, d))
  return Number.isNaN(date.getTime()) ? null : date
}

export function yearsBetween(from, to) {
  return (to.getTime() - from.getTime()) / MS_PER_YEAR
}

/** Add a fractional number of years to a date, for milestone dates. */
export function addYears(date, years) {
  return new Date(date.getTime() + years * MS_PER_YEAR)
}

/* ------------------------------------------------------- rule projection */

/**
 * Years from now until `rule` is satisfied, assuming uninterrupted service.
 * 0 means already satisfied. Returns null when the rule can never apply.
 */
export function yearsUntilRule(rule, age, service) {
  switch (rule.kind) {
    case "points": {
      // age and service both advance one year per year, so points grow at 2/yr.
      return Math.max(0, (rule.value - (age + service)) / 2)
    }
    case "pointsWithMinAge": {
      const points = Math.max(0, (rule.value - (age + service)) / 2)
      return Math.max(points, rule.minAge - age, 0)
    }
    case "age": {
      const byAge = rule.value - age
      const byService = rule.minService ? rule.minService - service : 0
      return Math.max(byAge, byService, 0)
    }
    case "ageAndService": {
      return Math.max(rule.age - age, rule.service - service, 0)
    }
    case "service": {
      return Math.max(rule.value - service, 0)
    }
    default:
      return null
  }
}

/** Best (soonest) rule in a set, with the years until it is met. */
export function soonestRule(rules, age, service) {
  let best = null
  for (const rule of rules ?? []) {
    const years = yearsUntilRule(rule, age, service)
    if (years === null) continue
    if (!best || years < best.years) best = { rule, years }
  }
  return best
}

export function describeRule(rule, pointsLabel = "points") {
  switch (rule.kind) {
    case "points": return `Rule of ${rule.value} (${pointsLabel})`
    case "pointsWithMinAge": return `Rule of ${rule.value} with minimum age ${rule.minAge}`
    case "age": return rule.minService ? `Age ${rule.value} with ${rule.minService} years of service` : `Age ${rule.value}`
    case "ageAndService": return `Age ${rule.age} with ${rule.service} years of service`
    case "service": return `${rule.value} years of service at any age`
    default: return "Unknown rule"
  }
}

/* ------------------------------------------------------- field extraction */

const FIELD_ALIASES = {
  externalId: ["id", "lead_id", "external_id", "record_id"],
  firstName: ["first_name", "firstname", "first", "given_name"],
  lastName: ["last_name", "lastname", "last", "surname", "family_name"],
  email: ["email", "email_address", "work_email", "primary_email"],
  phone: ["phone", "phone_number", "mobile", "cell", "work_phone"],
  state: ["state", "state_code", "st", "region"],
  employer: ["employer", "district", "school_district", "school", "organization", "company"],
  role: ["role", "title", "job_title", "position", "occupation"],
  birthDate: ["birth_date", "birthdate", "dob", "date_of_birth"],
  hireDate: ["hire_date", "hiredate", "start_date", "service_start_date", "date_of_hire"],
  serviceYears: ["years_of_service", "service_years", "yos", "credited_service", "service"],
  age: ["age", "current_age"],
  linkedinUrl: ["linkedin", "linkedin_url", "linkedin_profile"],
}

/** Map a loosely-keyed CSV row onto the engine's canonical lead shape. */
export function normalizeLead(row) {
  const get = (key) => {
    for (const alias of FIELD_ALIASES[key]) {
      const value = row[alias]
      if (value !== undefined && String(value).trim() !== "") return String(value).trim()
    }
    return ""
  }
  const lead = {}
  for (const key of Object.keys(FIELD_ALIASES)) lead[key] = get(key)
  lead.state = lead.state.toUpperCase().slice(0, 2)
  lead.email = lead.email.toLowerCase()
  return lead
}

/* --------------------------------------------------------------- scoring */

/** Transparent 100-point qualification score: fit + signal + evidence + reach. */
export function scoreLead({ system, lead, signal, yearsToUnreduced, hasBirthDate, hasHireDate, hasService }) {
  let targetFit = 0
  if (system) targetFit += 15
  if (lead.role) targetFit += 10
  if (lead.employer) targetFit += 5

  let signalStrength = 0
  if (signal === SIGNAL.ELIGIBLE_NOW) signalStrength = 35
  else if (yearsToUnreduced !== null && yearsToUnreduced <= 1) signalStrength = 32
  else if (yearsToUnreduced !== null && yearsToUnreduced <= 2) signalStrength = 28
  else if (yearsToUnreduced !== null && yearsToUnreduced <= 3) signalStrength = 20
  else if (yearsToUnreduced !== null && yearsToUnreduced <= 5) signalStrength = 12
  else if (yearsToUnreduced !== null) signalStrength = 4

  let evidence = 0
  if (hasBirthDate) evidence += 8
  if (hasHireDate) evidence += 7
  if (hasService) evidence += 5

  let contactability = 0
  if (looksLikeEmail(lead.email)) contactability += 10
  if (digitsOnly(lead.phone).length >= 10) contactability += 5

  const total = targetFit + signalStrength + evidence + contactability
  return { targetFit, signalStrength, evidence, contactability, total }
}

export function looksLikeEmail(value) {
  const email = String(value ?? "").trim()
  if (!email || email.length > 254) return false
  return /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/.test(email)
}

export function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "")
}

/* -------------------------------------------------------- CTA generation */

function round1(n) { return Math.round(n * 10) / 10 }

/** State-aware call to action; messaging never crosses state lines. */
export function buildCta({ system, tier, signal, points, pointsRuleValue, yearsToUnreduced, unreducedLabel, firstName }) {
  const who = firstName ? `${firstName}, ` : ""
  switch (signal) {
    case SIGNAL.ELIGIBLE_NOW:
      return `${who}you have already reached ${unreducedLabel} under ${system.name}. Let's model your unreduced benefit before you set a date.`
    case SIGNAL.MILESTONE_APPROACHING:
      if (pointsRuleValue !== null) {
        return `${who}you have ${round1(points)} ${system.pointsLabel} and hit the Rule of ${pointsRuleValue} in about ${round1(yearsToUnreduced)} years. Let's lock in your strategy now.`
      }
      return `${who}you reach ${unreducedLabel} in about ${round1(yearsToUnreduced)} years. Let's prepare for that milestone.`
    case SIGNAL.EARLY_RETIREMENT_CANDIDATE:
      return `${who}you qualify to retire early under ${system.name}, ${round1(yearsToUnreduced)} years before ${unreducedLabel}. Let's calculate reduced vs. unreduced before you set a date.`
    case SIGNAL.MILESTONE_WITHIN_5Y:
      return `${who}${unreducedLabel} is about ${round1(yearsToUnreduced)} years out under ${tier.label}. This is the window where planning changes the outcome.`
    default:
      return `${who}we track ${system.name} milestones so you know the moment your options change.`
  }
}

export function signalLabel(signal, pointsRuleValue) {
  switch (signal) {
    case SIGNAL.ELIGIBLE_NOW: return "Eligible Now (Unreduced)"
    case SIGNAL.MILESTONE_APPROACHING: return pointsRuleValue !== null ? `Rule of ${pointsRuleValue} Approaching` : "Milestone Approaching"
    case SIGNAL.EARLY_RETIREMENT_CANDIDATE: return "Early Retirement Candidate"
    case SIGNAL.MILESTONE_WITHIN_5Y: return "Milestone Within 5 Years"
    case SIGNAL.MONITOR: return "Monitor"
    case SIGNAL.INSUFFICIENT_DATA: return "Insufficient Data"
    case SIGNAL.UNSUPPORTED_STATE: return "Unsupported State"
    default: return "Unknown"
  }
}

/* ------------------------------------------------------------ evaluation */

/**
 * Evaluate one lead.
 * @param {object} row      raw CSV row (any header casing) or a normalized lead
 * @param {object} options  { asOf: Date|string, thresholds }
 */
export function evaluateLead(row, options = {}) {
  const asOf = parseDate(options.asOf) ?? new Date()
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) }
  const lead = row.__normalized ? row : normalizeLead(row)

  const base = {
    ...lead,
    asOf: asOf.toISOString().slice(0, 10),
    rulesAsOf: RULES_AS_OF,
    systemId: "",
    systemName: "",
    tierId: "",
    tierLabel: "",
    age: null,
    serviceYears: null,
    points: null,
    unreducedRule: "",
    yearsToUnreduced: null,
    unreducedDate: "",
    earlyEligibleNow: false,
    earlyRule: "",
    signal: SIGNAL.INSUFFICIENT_DATA,
    signalLabel: signalLabel(SIGNAL.INSUFFICIENT_DATA, null),
    score: 0,
    scoreBreakdown: null,
    sequenceKey: "",
    cta: "",
    dataGaps: [],
  }

  const system = resolveSystem(lead.state, lead.role)
  if (!system) {
    base.signal = SIGNAL.UNSUPPORTED_STATE
    base.signalLabel = signalLabel(SIGNAL.UNSUPPORTED_STATE, null)
    base.dataGaps = lead.state ? [`No pension rules configured for state "${lead.state}"`] : ["Missing state"]
    return base
  }
  base.systemId = system.id
  base.systemName = system.name

  const birthDate = parseDate(lead.birthDate)
  const hireDate = parseDate(lead.hireDate)
  const explicitAge = lead.age ? Number(lead.age) : NaN
  const explicitService = lead.serviceYears ? Number(lead.serviceYears) : NaN

  const age = birthDate ? yearsBetween(birthDate, asOf) : Number.isFinite(explicitAge) ? explicitAge : null
  const service = Number.isFinite(explicitService)
    ? explicitService
    : hireDate ? Math.max(0, yearsBetween(hireDate, asOf)) : null

  const gaps = []
  if (age === null) gaps.push("Missing birth date or age")
  if (service === null) gaps.push("Missing hire date or years of service")
  if (!hireDate) gaps.push("Missing hire date (tier cannot be confirmed)")

  base.age = age === null ? null : round1(age)
  base.serviceYears = service === null ? null : round1(service)
  base.dataGaps = gaps

  const tier = resolveTier(system, hireDate)
  if (!tier || age === null || service === null) {
    base.signal = SIGNAL.INSUFFICIENT_DATA
    base.signalLabel = signalLabel(SIGNAL.INSUFFICIENT_DATA, null)
    base.scoreBreakdown = scoreLead({
      system, lead, signal: base.signal, yearsToUnreduced: null,
      hasBirthDate: !!birthDate, hasHireDate: !!hireDate, hasService: service !== null,
    })
    base.score = base.scoreBreakdown.total
    return base
  }

  base.tierId = tier.id
  base.tierLabel = tier.label
  base.points = round1(age + service)

  const unreduced = soonestRule(tier.unreduced, age, service)
  const early = soonestRule(tier.early, age, service)
  const yearsToUnreduced = unreduced ? unreduced.years : null
  const unreducedLabel = unreduced ? describeRule(unreduced.rule, system.pointsLabel) : "normal retirement"
  const pointsRuleValue =
    unreduced && (unreduced.rule.kind === "points" || unreduced.rule.kind === "pointsWithMinAge")
      ? unreduced.rule.value
      : null

  let signal
  if (yearsToUnreduced === null) signal = SIGNAL.MONITOR
  else if (yearsToUnreduced <= 0) signal = SIGNAL.ELIGIBLE_NOW
  else if (yearsToUnreduced <= thresholds.approaching) signal = SIGNAL.MILESTONE_APPROACHING
  else if (early && early.years <= 0) signal = SIGNAL.EARLY_RETIREMENT_CANDIDATE
  else if (yearsToUnreduced <= thresholds.nearTerm) signal = SIGNAL.MILESTONE_WITHIN_5Y
  else signal = SIGNAL.MONITOR

  base.unreducedRule = unreducedLabel
  base.yearsToUnreduced = yearsToUnreduced === null ? null : round1(yearsToUnreduced)
  base.unreducedDate = yearsToUnreduced === null ? "" : addYears(asOf, yearsToUnreduced).toISOString().slice(0, 10)
  base.earlyEligibleNow = !!early && early.years <= 0
  base.earlyRule = early ? describeRule(early.rule, system.pointsLabel) : ""
  base.signal = signal
  base.signalLabel = signalLabel(signal, pointsRuleValue)
  base.sequenceKey = `${system.id}__${signal}`
  base.cta = buildCta({
    system, tier, signal,
    points: age + service,
    pointsRuleValue,
    yearsToUnreduced: yearsToUnreduced ?? 0,
    unreducedLabel,
    firstName: lead.firstName,
  })
  base.scoreBreakdown = scoreLead({
    system, lead, signal, yearsToUnreduced,
    hasBirthDate: !!birthDate, hasHireDate: !!hireDate, hasService: service !== null,
  })
  base.score = base.scoreBreakdown.total
  return base
}

/** Signals considered worth pushing to the CRM. */
export const ACTIONABLE_SIGNALS = [
  SIGNAL.ELIGIBLE_NOW,
  SIGNAL.MILESTONE_APPROACHING,
  SIGNAL.EARLY_RETIREMENT_CANDIDATE,
  SIGNAL.MILESTONE_WITHIN_5Y,
]

export function isActionable(result, minScore = 0) {
  return ACTIONABLE_SIGNALS.includes(result.signal) && result.score >= minScore
}
