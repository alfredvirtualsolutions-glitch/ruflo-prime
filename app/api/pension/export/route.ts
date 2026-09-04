import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { toCsv } from "@/lib/pension/csv.mjs"
import { EXPORT_COLUMNS } from "@/lib/pension/pipeline.mjs"
import { latestSignalsWithLeads } from "@/lib/pension/store"

export const runtime = "nodejs"

/** GET the newest run as a CRM-ready CSV. `?all=1` includes non-actionable rows. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const includeAll = new URL(request.url).searchParams.get("all") === "1"
  const { run, rows } = await latestSignalsWithLeads(session.user.id, !includeAll)
  if (!run) return NextResponse.json({ error: "No pension runs yet" }, { status: 404 })

  const records = rows.map(({ signal, lead }) => ({
    externalId: lead.externalId ?? "",
    firstName: lead.firstName ?? "",
    lastName: lead.lastName ?? "",
    email: lead.email ?? "",
    emailStatus: signal.emailStatus ?? "",
    phone: lead.phone ?? "",
    state: lead.state ?? "",
    employer: lead.employer ?? "",
    role: lead.role ?? "",
    systemId: signal.systemId ?? "",
    systemName: signal.systemName ?? "",
    tierLabel: signal.tierLabel ?? "",
    age: signal.age ?? "",
    serviceYears: signal.serviceYears ?? "",
    points: signal.points ?? "",
    signal: signal.signal,
    signalLabel: signal.signalLabel,
    unreducedRule: signal.unreducedRule ?? "",
    yearsToUnreduced: signal.yearsToUnreduced ?? "",
    unreducedDate: signal.unreducedDate ?? "",
    earlyEligibleNow: signal.earlyEligibleNow,
    earlyRule: signal.earlyRule ?? "",
    score: signal.score,
    sequenceKey: signal.sequenceKey ?? "",
    cta: signal.cta ?? "",
    asOf: signal.asOf,
    rulesAsOf: signal.rulesAsOf ?? "",
  }))

  return new NextResponse(toCsv(records, EXPORT_COLUMNS), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="active_pension_signals_${run.asOf}.csv"`,
    },
  })
}
