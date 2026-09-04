import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { pensionLeads, pensionRuns, pensionSignals } from "@/lib/db/schema"
import type { SignalResult } from "./engine.d.mts"
import { runPipeline } from "./pipeline.mjs"

type Row = Record<string, string>

export type RunOptions = {
  asOf?: string
  minScore?: number
  source?: string
}

function dedupeKey(result: SignalResult) {
  if (result.externalId) return `id:${result.externalId}`
  if (result.email) return `email:${String(result.email).toLowerCase()}`
  return `name:${result.firstName}|${result.lastName}|${result.employer}|${result.state}`.toLowerCase()
}

function str(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value)
}

/**
 * Evaluate raw rows, persist the leads, the per-lead signals, and the run
 * summary. Leads are upserted on (userId, dedupeKey) so re-running a list
 * refreshes rather than duplicates it.
 */
export async function persistRun(userId: string, rows: Row[], options: RunOptions = {}) {
  const asOf = options.asOf ?? new Date().toISOString().slice(0, 10)
  const { results, actionable, rejected, manifest } = await runPipeline(rows, {
    asOf,
    minScore: options.minScore ?? 0,
  })

  const runId = crypto.randomUUID()
  const now = new Date()
  const actionableIds = new Set(actionable.map((r) => dedupeKey(r)))
  const reasons = new Map(rejected.map((r) => [dedupeKey(r), r.rejectReason] as const))

  await db.insert(pensionRuns).values({
    id: runId,
    userId,
    source: options.source ?? "upload",
    status: "complete",
    asOf,
    leadsRead: manifest.total + manifest.duplicates,
    duplicates: manifest.duplicates,
    actionable: manifest.actionable,
    averageScore: manifest.averageScore,
    manifest,
    createdAt: now,
  })

  for (const result of results) {
    const key = dedupeKey(result)
    const leadValues = {
      userId,
      dedupeKey: key,
      externalId: str(result.externalId),
      firstName: str(result.firstName),
      lastName: str(result.lastName),
      email: str(result.email),
      phone: str(result.phone),
      state: str(result.state),
      employer: str(result.employer),
      role: str(result.role),
      birthDate: str(result.birthDate),
      hireDate: str(result.hireDate),
      serviceYears: str(result.serviceYears),
      linkedinUrl: str(result.linkedinUrl),
      updatedAt: now,
    }

    const [lead] = await db
      .insert(pensionLeads)
      .values({ id: crypto.randomUUID(), createdAt: now, ...leadValues })
      .onConflictDoUpdate({ target: [pensionLeads.userId, pensionLeads.dedupeKey], set: leadValues })
      .returning({ id: pensionLeads.id })

    await db.insert(pensionSignals).values({
      id: crypto.randomUUID(),
      userId,
      leadId: lead.id,
      runId,
      systemId: str(result.systemId),
      systemName: str(result.systemName),
      tierId: str(result.tierId),
      tierLabel: str(result.tierLabel),
      age: str(result.age),
      serviceYears: str(result.serviceYears),
      points: str(result.points),
      signal: result.signal,
      signalLabel: result.signalLabel,
      unreducedRule: str(result.unreducedRule),
      yearsToUnreduced: str(result.yearsToUnreduced),
      unreducedDate: str(result.unreducedDate),
      earlyEligibleNow: !!result.earlyEligibleNow,
      earlyRule: str(result.earlyRule),
      score: result.score,
      scoreBreakdown: result.scoreBreakdown,
      emailStatus: str(result.emailStatus),
      sequenceKey: str(result.sequenceKey),
      cta: str(result.cta),
      dataGaps: result.dataGaps ?? [],
      actionable: actionableIds.has(key),
      rejectReason: reasons.get(key) ?? null,
      asOf,
      rulesAsOf: str(result.rulesAsOf),
      createdAt: now,
    })
  }

  return { runId, manifest }
}

/** Every stored lead for a user, shaped as engine input rows. */
export async function loadLeadRows(userId: string): Promise<Row[]> {
  const leads = await db.select().from(pensionLeads).where(eq(pensionLeads.userId, userId))
  return leads.map((lead) => ({
    id: lead.externalId ?? "",
    first_name: lead.firstName ?? "",
    last_name: lead.lastName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    state: lead.state ?? "",
    district: lead.employer ?? "",
    title: lead.role ?? "",
    birth_date: lead.birthDate ?? "",
    hire_date: lead.hireDate ?? "",
    years_of_service: lead.serviceYears ?? "",
    linkedin_url: lead.linkedinUrl ?? "",
  }))
}

export async function latestRun(userId: string) {
  const [run] = await db
    .select()
    .from(pensionRuns)
    .where(eq(pensionRuns.userId, userId))
    .orderBy(desc(pensionRuns.createdAt))
    .limit(1)
  return run ?? null
}

/** Signals from the newest run, highest score first. */
export async function latestSignals(userId: string, onlyActionable = true) {
  const run = await latestRun(userId)
  if (!run) return { run: null, signals: [] }
  const filters = [eq(pensionSignals.userId, userId), eq(pensionSignals.runId, run.id)]
  if (onlyActionable) filters.push(eq(pensionSignals.actionable, true))
  const signals = await db
    .select()
    .from(pensionSignals)
    .where(and(...filters))
    .orderBy(desc(pensionSignals.score))
  return { run, signals }
}

/** Join stored signals back to their lead so an export has contact details. */
export async function latestSignalsWithLeads(userId: string, onlyActionable = true) {
  const run = await latestRun(userId)
  if (!run) return { run: null, rows: [] }
  const filters = [eq(pensionSignals.userId, userId), eq(pensionSignals.runId, run.id)]
  if (onlyActionable) filters.push(eq(pensionSignals.actionable, true))
  const rows = await db
    .select({ signal: pensionSignals, lead: pensionLeads })
    .from(pensionSignals)
    .innerJoin(pensionLeads, eq(pensionSignals.leadId, pensionLeads.id))
    .where(and(...filters))
    .orderBy(desc(pensionSignals.score))
  return { run, rows }
}
