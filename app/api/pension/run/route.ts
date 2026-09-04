import { NextResponse } from "next/server"
import { desc } from "drizzle-orm"

import { db } from "@/lib/db"
import { pensionLeads } from "@/lib/db/schema"
import { loadLeadRows, persistRun } from "@/lib/pension/store"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Scheduled re-evaluation. Milestones move with the calendar, so yesterday's
 * "5 years out" becomes today's "approaching" without any new data arriving.
 *
 * Protect it with CRON_SECRET and call it daily:
 *   Authorization: Bearer $CRON_SECRET
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 })
  }
  const provided = request.headers.get("authorization") ?? ""
  if (provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const owners = await db
    .selectDistinct({ userId: pensionLeads.userId })
    .from(pensionLeads)
    .orderBy(desc(pensionLeads.userId))

  const asOf = new Date().toISOString().slice(0, 10)
  const runs = []
  for (const { userId } of owners) {
    const rows = await loadLeadRows(userId)
    if (rows.length === 0) continue
    const { runId, manifest } = await persistRun(userId, rows, { asOf, source: "scheduled" })
    runs.push({ userId, runId, actionable: manifest.actionable, total: manifest.total })
  }
  return NextResponse.json({ asOf, runs })
}

export const GET = handle
export const POST = handle
