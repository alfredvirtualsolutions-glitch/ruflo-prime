import assert from "node:assert/strict"
import test from "node:test"

import { parseCsv, toCsv, normalizeHeader } from "../lib/pension/csv.mjs"
import {
  SIGNAL, describeRule, evaluateLead, looksLikeEmail,
  parseDate, soonestRule, yearsUntilRule,
} from "../lib/pension/engine.mjs"
import { PENSION_SYSTEMS, resolveSystem, resolveTier } from "../lib/pension/rules.mjs"
import { buildManifest, heuristicVerifyEmail, runPipeline, toExportRows } from "../lib/pension/pipeline.mjs"

const ASOF = "2026-09-04"

/* ------------------------------------------------------------------- csv */

test("csv parser handles quotes, commas and embedded newlines", () => {
  const { rows } = parseCsv('First Name,Notes\r\nDana,"Mesa, AZ\nveteran"\n')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].first_name, "Dana")
  assert.equal(rows[0].notes, "Mesa, AZ\nveteran")
})

test("csv round-trips values that need escaping", () => {
  const csv = toCsv([{ a: 'say "hi"', b: "x,y" }], ["a", "b"])
  const { rows } = parseCsv(csv)
  assert.deepEqual(rows[0], { a: 'say "hi"', b: "x,y" })
})

test("header normalization is alias friendly", () => {
  assert.equal(normalizeHeader("Years of Service"), "years_of_service")
  assert.equal(normalizeHeader(" DOB "), "dob")
})

/* ------------------------------------------------------------------ dates */

test("date parsing covers the formats found in educator exports", () => {
  assert.equal(parseDate("1968-04-02").toISOString().slice(0, 10), "1968-04-02")
  assert.equal(parseDate("4/2/1968").toISOString().slice(0, 10), "1968-04-02")
  assert.equal(parseDate("1968").toISOString().slice(0, 10), "1968-07-01")
  assert.equal(parseDate(""), null)
  assert.equal(parseDate("not a date"), null)
})

/* ------------------------------------------------------------------ rules */

test("points rule closes at two points per year", () => {
  // 74 points today -> 3 years to 80, because age and service both advance.
  assert.equal(yearsUntilRule({ kind: "points", value: 80 }, 54, 20), 3)
  assert.equal(yearsUntilRule({ kind: "points", value: 80 }, 60, 25), 0)
})

test("minimum-age rule of 80 is gated by the age floor", () => {
  // 80 points at 50 with 30 years, but Tier 5/6 still requires age 62.
  assert.equal(yearsUntilRule({ kind: "pointsWithMinAge", value: 80, minAge: 62 }, 50, 30), 12)
})

test("age-and-service rules take the later of the two thresholds", () => {
  assert.equal(yearsUntilRule({ kind: "ageAndService", age: 65, service: 5 }, 60, 1), 5)
  assert.equal(yearsUntilRule({ kind: "ageAndService", age: 65, service: 5 }, 64, 0), 5)
})

test("soonestRule picks the earliest satisfiable rule", () => {
  const best = soonestRule(
    [{ kind: "age", value: 65 }, { kind: "points", value: 80 }],
    58, 20,
  )
  assert.equal(best.rule.kind, "points")
  assert.equal(best.years, 1)
})

test("every configured tier has at least one unreduced rule", () => {
  for (const system of PENSION_SYSTEMS) {
    for (const tier of system.tiers) {
      assert.ok(tier.unreduced?.length, `${tier.id} needs an unreduced rule`)
      for (const rule of [...tier.unreduced, ...(tier.early ?? [])]) {
        assert.notEqual(yearsUntilRule(rule, 50, 20), null, `${tier.id} has an unknown rule kind`)
        assert.ok(describeRule(rule).length > 0)
      }
    }
  }
})

test("tier resolution follows the hire-date windows", () => {
  const asrs = resolveSystem("AZ")
  assert.equal(resolveTier(asrs, parseDate("2005-08-01")).id, "AZ_ASRS_PRE_2011")
  assert.equal(resolveTier(asrs, parseDate("2011-07-01")).id, "AZ_ASRS_POST_2011")
  const trs = resolveSystem("TX")
  assert.equal(resolveTier(trs, parseDate("2000-01-01")).id, "TX_TRS_TIER_1")
  assert.equal(resolveTier(trs, parseDate("2010-01-01")).id, "TX_TRS_TIER_2_4")
  assert.equal(resolveTier(trs, parseDate("2014-09-01")).id, "TX_TRS_TIER_5_6")
})

test("California splits CalSTRS and CalPERS by role", () => {
  assert.equal(resolveSystem("CA", "High School Teacher").id, "CA_CALSTRS")
  assert.equal(resolveSystem("CA", "Classified Staff - Custodian").id, "CA_CALPERS")
})

/* -------------------------------------------------------------- signals */

test("AZ pre-2011 member one year from 80 points is a Rule of 80 signal", () => {
  const result = evaluateLead(
    { first_name: "Dana", state: "AZ", title: "Teacher", dob: "1970-09-04", hire_date: "2004-09-04" },
    { asOf: ASOF },
  )
  assert.equal(result.systemId, "AZ_ASRS")
  assert.equal(result.tierId, "AZ_ASRS_PRE_2011")
  assert.equal(result.points, 78)
  assert.equal(result.signal, SIGNAL.MILESTONE_APPROACHING)
  assert.equal(result.signalLabel, "Rule of 80 Approaching")
  assert.equal(result.yearsToUnreduced, 1)
  assert.match(result.cta, /78 ASRS points/)
})

test("AZ post-2011 member is measured against 85 and gated by the nearest rule", () => {
  const result = evaluateLead(
    { state: "AZ", title: "Teacher", dob: "1970-09-04", hire_date: "2012-09-04" },
    { asOf: ASOF },
  )
  assert.equal(result.tierId, "AZ_ASRS_POST_2011")
  // 56 + 14 = 70 points, so the 85-point milestone is 7.5 years out; age 62
  // with 10 years of service arrives sooner and therefore governs.
  assert.equal(result.points, 70)
  assert.equal(result.unreducedRule, "Age 62 with 10 years of service")
  assert.equal(result.yearsToUnreduced, 6)
  // Unreduced is outside the 5-year window but they can already retire reduced.
  assert.equal(result.earlyEligibleNow, true)
  assert.equal(result.signal, SIGNAL.EARLY_RETIREMENT_CANDIDATE)
})

test("TX Tier 1 hits Rule of 80 with no minimum age", () => {
  const result = evaluateLead(
    { state: "TX", title: "Teacher", dob: "1974-09-04", hire_date: "1998-09-04" },
    { asOf: ASOF },
  )
  assert.equal(result.tierId, "TX_TRS_TIER_1")
  assert.equal(result.age, 52)
  assert.equal(result.serviceYears, 28)
  assert.equal(result.signal, SIGNAL.ELIGIBLE_NOW)
  assert.equal(result.unreducedRule, "Rule of 80 (TRS points)")
})

test("TX Tier 5/6 age floor delays the unreduced date past the Rule of 80", () => {
  const result = evaluateLead(
    { state: "TX", title: "Teacher", dob: "1976-09-04", hire_date: "2015-09-04" },
    { asOf: ASOF },
  )
  assert.equal(result.tierId, "TX_TRS_TIER_5_6")
  assert.equal(result.unreducedRule, "Rule of 80 with minimum age 62")
  // 50 + 11 = 61 points reaches 80 in 9.5 years, but the age-62 floor pushes
  // the unreduced date out to 12 years -- so this is not an outreach signal yet.
  assert.equal(result.points, 61)
  assert.equal(result.yearsToUnreduced, 12)
  assert.equal(result.signal, SIGNAL.MONITOR)
})

test("NV PERS 30-year member is eligible at any age", () => {
  const result = evaluateLead(
    { state: "NV", title: "Teacher", dob: "1978-09-04", hire_date: "1996-09-04", years_of_service: "30" },
    { asOf: ASOF },
  )
  assert.equal(result.systemId, "NV_PERS")
  assert.equal(result.signal, SIGNAL.ELIGIBLE_NOW)
  assert.equal(result.unreducedRule, "30 years of service at any age")
})

test("early-eligible member years away from unreduced is an early-retirement candidate", () => {
  const result = evaluateLead(
    { state: "NV", title: "Teacher", dob: "1971-09-04", hire_date: "2011-09-04" },
    { asOf: ASOF },
  )
  assert.equal(result.earlyEligibleNow, true)
  assert.equal(result.signal, SIGNAL.EARLY_RETIREMENT_CANDIDATE)
  assert.match(result.cta, /reduced vs\. unreduced/)
})

test("young member with no near milestone is only monitored", () => {
  const result = evaluateLead(
    { state: "AZ", title: "Teacher", dob: "1995-09-04", hire_date: "2020-09-04" },
    { asOf: ASOF },
  )
  assert.equal(result.signal, SIGNAL.MONITOR)
})

test("missing dates degrade to insufficient data rather than a wrong signal", () => {
  const result = evaluateLead({ state: "AZ", title: "Teacher" }, { asOf: ASOF })
  assert.equal(result.signal, SIGNAL.INSUFFICIENT_DATA)
  assert.ok(result.dataGaps.length >= 2)
  assert.equal(result.cta, "")
})

test("unconfigured states are flagged, never guessed", () => {
  const result = evaluateLead({ state: "OH", title: "Teacher", dob: "1970-01-01", hire_date: "1995-01-01" }, { asOf: ASOF })
  assert.equal(result.signal, SIGNAL.UNSUPPORTED_STATE)
  assert.match(result.dataGaps[0], /OH/)
})

test("evaluation is reproducible for a fixed asOf date", () => {
  const row = { state: "TX", title: "Teacher", dob: "1970-01-01", hire_date: "1995-01-01" }
  assert.deepEqual(evaluateLead(row, { asOf: ASOF }), evaluateLead(row, { asOf: ASOF }))
})

/* -------------------------------------------------------------- scoring */

test("score rewards complete, contactable, near-milestone leads", () => {
  const rich = evaluateLead(
    { first_name: "Dana", state: "AZ", title: "Teacher", district: "Mesa USD", dob: "1970-09-04", hire_date: "2004-09-04", email: "dana@mesa.k12.az.us", phone: "6025550100" },
    { asOf: ASOF },
  )
  const sparse = evaluateLead(
    { state: "AZ", dob: "1995-09-04", hire_date: "2020-09-04" },
    { asOf: ASOF },
  )
  assert.equal(rich.score, 97)
  assert.ok(rich.score > sparse.score)
  assert.equal(rich.scoreBreakdown.targetFit + rich.scoreBreakdown.signalStrength + rich.scoreBreakdown.evidence + rich.scoreBreakdown.contactability, rich.score)
})

test("email validity is checked before anything is sent", () => {
  assert.equal(looksLikeEmail("dana@mesa.k12.az.us"), true)
  assert.equal(looksLikeEmail("dana@localhost"), false)
  assert.equal(looksLikeEmail("not-an-email"), false)
  assert.equal(heuristicVerifyEmail("info@district.org").status, "risky")
  assert.equal(heuristicVerifyEmail("a@b.example.com").status, "invalid")
  assert.equal(heuristicVerifyEmail("dana@mesa.k12.az.us").status, "unknown")
})

/* ------------------------------------------------------------- pipeline */

const SAMPLE = [
  { first_name: "Dana", last_name: "Reyes", state: "AZ", title: "Teacher", district: "Mesa USD", dob: "1970-09-04", hire_date: "2004-09-04", email: "dana@mesa.k12.az.us" },
  { first_name: "Dana", last_name: "Reyes", state: "AZ", title: "Teacher", district: "Mesa USD", dob: "1970-09-04", hire_date: "2004-09-04", email: "dana@mesa.k12.az.us" },
  { first_name: "Marcus", last_name: "Hill", state: "TX", title: "Teacher", district: "Austin ISD", dob: "1974-09-04", hire_date: "1998-09-04", email: "marcus@austinisd.org" },
  { first_name: "Sara", last_name: "Kim", state: "AZ", title: "Teacher", district: "Tucson USD", dob: "1996-01-01", hire_date: "2021-01-01", email: "sara@tusd.org" },
  { first_name: "Bad", last_name: "Address", state: "NV", title: "Teacher", dob: "1960-01-01", hire_date: "1990-01-01", email: "bad@test.example.com" },
]

test("pipeline dedupes, ranks, and suppresses undeliverable addresses", async () => {
  const { actionable, rejected, manifest, duplicates } = await runPipeline(SAMPLE, { asOf: ASOF })
  assert.equal(duplicates.length, 1)
  assert.equal(manifest.total, 4)
  assert.equal(actionable.length, 2)
  assert.deepEqual(actionable.map((r) => r.firstName), ["Marcus", "Dana"])
  assert.ok(rejected.some((r) => r.firstName === "Sara" && /outreach window/.test(r.rejectReason)))
  assert.ok(rejected.some((r) => r.firstName === "Bad" && /Suppressed/.test(r.rejectReason)))
})

test("minScore gate keeps low-confidence rows out of the CRM", async () => {
  const { actionable } = await runPipeline(SAMPLE, { asOf: ASOF, minScore: 95 })
  assert.ok(actionable.every((r) => r.score >= 95))
})

test("enrichment adapter can fill a gap and change the outcome", async () => {
  const rows = [{ first_name: "Lee", state: "TX", title: "Teacher", dob: "1974-09-04", email: "lee@isd.org" }]
  const without = await runPipeline(rows, { asOf: ASOF })
  assert.equal(without.actionable.length, 0)
  const withEnrichment = await runPipeline(rows, {
    asOf: ASOF,
    enrich: async () => ({ hireDate: "1998-09-04" }),
  })
  assert.equal(withEnrichment.actionable.length, 1)
  assert.equal(withEnrichment.actionable[0].signal, SIGNAL.ELIGIBLE_NOW)
})

test("a failing adapter degrades the run instead of breaking it", async () => {
  const { results } = await runPipeline([SAMPLE[0]], {
    asOf: ASOF,
    enrich: async () => { throw new Error("vendor 500") },
    verifyEmail: async () => { throw new Error("verifier down") },
  })
  assert.equal(results.length, 1)
  assert.equal(results[0].emailStatus, "unknown")
  assert.match(results[0].emailStatusReason, /verifier down/)
})

test("outreach routing keeps each state on its own sequence", async () => {
  const { actionable, manifest } = await runPipeline(SAMPLE, { asOf: ASOF })
  const keys = new Set(actionable.map((r) => r.sequenceKey))
  assert.ok(keys.has("AZ_ASRS__MILESTONE_APPROACHING"))
  assert.ok(keys.has("TX_TRS__ELIGIBLE_NOW"))
  assert.equal(Object.keys(manifest.bySequence).length, keys.size)
})

test("export rows carry every CRM column, even when empty", async () => {
  const { actionable } = await runPipeline(SAMPLE, { asOf: ASOF })
  const rows = toExportRows(actionable)
  assert.ok(rows.length > 0)
  for (const row of rows) assert.ok("externalId" in row && "cta" in row && "sequenceKey" in row)
})

test("manifest totals stay internally consistent", () => {
  const manifest = buildManifest(
    [{ signal: "A", state: "AZ", score: 10 }, { signal: "A", state: "TX", score: 20 }],
    [{ signal: "A", state: "AZ", score: 10, sequenceKey: "k" }],
    [{}],
  )
  assert.equal(manifest.total, 2)
  assert.equal(manifest.actionable, 1)
  assert.equal(manifest.duplicates, 1)
  assert.deepEqual(manifest.bySignal, { A: 2 })
  assert.deepEqual(manifest.byState, { AZ: 1, TX: 1 })
})
