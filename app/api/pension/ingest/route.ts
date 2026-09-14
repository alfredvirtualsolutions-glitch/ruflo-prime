import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { parseCsv } from "@/lib/pension/csv.mjs"
import { persistRun } from "@/lib/pension/store"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BYTES = 5_000_000
const MAX_ROWS = 25_000

/**
 * POST a raw educator lead CSV and get back the run manifest.
 *
 *   curl -X POST https://<app>/api/pension/ingest \
 *        -H "Content-Type: text/csv" --data-binary @leads.csv
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contentType = request.headers.get("content-type") ?? ""
  let csv = ""
  let asOf: string | undefined
  let minScore = 0

  try {
    if (contentType.includes("application/json")) {
      const body = await request.json()
      csv = String(body.csv ?? "")
      asOf = body.asOf ? String(body.asOf) : undefined
      minScore = Number(body.minScore ?? 0)
    } else if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      csv = file instanceof File ? await file.text() : String(form.get("csv") ?? "")
      const asOfValue = form.get("asOf")
      if (asOfValue) asOf = String(asOfValue)
      minScore = Number(form.get("minScore") ?? 0)
    } else {
      csv = await request.text()
    }
  } catch {
    return NextResponse.json({ error: "Could not read the request body" }, { status: 400 })
  }

  if (!csv.trim()) return NextResponse.json({ error: "No CSV content received" }, { status: 400 })
  if (csv.length > MAX_BYTES) {
    return NextResponse.json({ error: `CSV is larger than ${MAX_BYTES} bytes; split the file` }, { status: 413 })
  }

  const { rows } = parseCsv(csv)
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found. The first line must be a header." }, { status: 400 })
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (${rows.length}); the limit is ${MAX_ROWS}` }, { status: 413 })
  }

  const { runId, manifest } = await persistRun(session.user.id, rows, {
    asOf,
    minScore: Number.isFinite(minScore) ? minScore : 0,
    source: "upload",
  })
  return NextResponse.json({ runId, manifest })
}
