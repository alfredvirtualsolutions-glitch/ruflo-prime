/**
 * Four-phase pipeline: signal identification -> hygiene -> enrichment ->
 * validation + outreach routing. Enrichment and email verification are
 * injected as adapters so no vendor is hard-wired; see docs/PENSION_AUTOMATION.md.
 *
 * Adapter contracts (both optional, both may be async):
 *   enrich(lead)        -> partial lead patch, e.g. { email, linkedinUrl, role }
 *   verifyEmail(email)  -> { status: "valid"|"risky"|"invalid"|"unknown", score? }
 */

import { evaluateLead, isActionable, looksLikeEmail, normalizeLead, SIGNAL } from "./engine.mjs"

/** Cheap local checks so a run is useful before any paid vendor is wired up. */
export function heuristicVerifyEmail(email) {
  const value = String(email ?? "").trim().toLowerCase()
  if (!value) return { status: "unknown", reason: "no address" }
  if (!looksLikeEmail(value)) return { status: "invalid", reason: "malformed" }
  const local = value.split("@")[0]
  if (/^(info|admin|office|noreply|no-reply|webmaster|postmaster|contact|support|help|sales)$/.test(local)) {
    return { status: "risky", reason: "role-based mailbox" }
  }
  if (/(example|test|invalid|localhost)\./.test(value.split("@")[1] ?? "")) {
    return { status: "invalid", reason: "non-routable domain" }
  }
  return { status: "unknown", reason: "syntax ok, not externally verified" }
}

function dedupeKey(lead) {
  if (lead.externalId) return `id:${lead.externalId}`
  if (lead.email) return `email:${lead.email}`
  return `name:${lead.firstName}|${lead.lastName}|${lead.employer}|${lead.state}`.toLowerCase()
}

/**
 * Run the full pipeline over raw rows.
 * @returns {Promise<{ results, actionable, manifest, rejected }>}
 */
export async function runPipeline(rows, options = {}) {
  const { asOf, thresholds, minScore = 0, enrich, verifyEmail = heuristicVerifyEmail, suppressInvalidEmail = true } = options

  // Phase 1-2: normalize and deduplicate.
  const seen = new Map()
  const duplicates = []
  for (const row of rows) {
    const lead = normalizeLead(row)
    const key = dedupeKey(lead)
    if (seen.has(key)) { duplicates.push(lead); continue }
    seen.set(key, lead)
  }

  const results = []
  for (const lead of seen.values()) {
    // Phase 3: enrichment, only where it can change the outcome.
    let working = lead
    if (typeof enrich === "function") {
      try {
        const patch = await enrich(lead)
        if (patch && typeof patch === "object") working = { ...lead, ...pickFilled(patch) }
      } catch (error) {
        working = { ...lead, enrichmentError: String(error?.message ?? error) }
      }
    }

    const result = evaluateLead({ ...working, __normalized: true }, { asOf, thresholds })

    // Phase 4: deliverability gate + sequence routing.
    let verification = { status: "unknown", reason: "not checked" }
    try {
      verification = (await verifyEmail(result.email)) ?? verification
    } catch (error) {
      verification = { status: "unknown", reason: String(error?.message ?? error) }
    }
    result.emailStatus = verification.status
    result.emailStatusReason = verification.reason ?? ""
    if (result.emailStatus === "invalid") result.score = Math.max(0, result.score - 10)
    results.push(result)
  }

  const rejected = []
  const actionable = []
  for (const result of results) {
    if (!isActionable(result, minScore)) {
      rejected.push({ ...result, rejectReason: rejectReason(result, minScore) })
      continue
    }
    if (suppressInvalidEmail && result.emailStatus === "invalid") {
      rejected.push({ ...result, rejectReason: `Suppressed: ${result.emailStatusReason || "undeliverable email"}` })
      continue
    }
    actionable.push(result)
  }
  actionable.sort((a, b) => b.score - a.score || (a.yearsToUnreduced ?? 99) - (b.yearsToUnreduced ?? 99))

  return { results, actionable, rejected, duplicates, manifest: buildManifest(results, actionable, duplicates) }
}

function pickFilled(patch) {
  const out = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== null && value !== undefined && String(value).trim() !== "") out[key] = value
  }
  return out
}

function rejectReason(result, minScore) {
  if (result.signal === SIGNAL.UNSUPPORTED_STATE) return result.dataGaps.join("; ") || "State not covered"
  if (result.signal === SIGNAL.INSUFFICIENT_DATA) return result.dataGaps.join("; ") || "Insufficient data"
  if (result.signal === SIGNAL.MONITOR) return "No milestone inside the outreach window"
  return `Score ${result.score} below minimum ${minScore}`
}

/** Roll-up counts for the dashboard and the daily report. */
export function buildManifest(results, actionable, duplicates = []) {
  const bySignal = {}
  const byState = {}
  const bySequence = {}
  for (const result of results) {
    bySignal[result.signal] = (bySignal[result.signal] ?? 0) + 1
    if (result.state) byState[result.state] = (byState[result.state] ?? 0) + 1
  }
  for (const result of actionable) {
    bySequence[result.sequenceKey] = (bySequence[result.sequenceKey] ?? 0) + 1
  }
  const scores = actionable.map((r) => r.score)
  return {
    total: results.length,
    duplicates: duplicates.length,
    actionable: actionable.length,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    bySignal,
    byState,
    bySequence,
  }
}

/** Column order for the CRM-ready export. */
export const EXPORT_COLUMNS = [
  "externalId", "firstName", "lastName", "email", "emailStatus", "phone", "state", "employer", "role",
  "systemId", "systemName", "tierLabel", "age", "serviceYears", "points",
  "signal", "signalLabel", "unreducedRule", "yearsToUnreduced", "unreducedDate",
  "earlyEligibleNow", "earlyRule", "score", "sequenceKey", "cta", "asOf", "rulesAsOf",
]

export function toExportRows(results) {
  return results.map((r) => {
    const row = {}
    for (const column of EXPORT_COLUMNS) row[column] = r[column] ?? ""
    return row
  })
}
