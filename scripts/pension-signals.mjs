#!/usr/bin/env node
/**
 * Turn a raw educator lead CSV into a scored, CRM-ready signal manifest.
 *
 *   node scripts/pension-signals.mjs --input leads.csv --output signals.csv
 *
 * No install step and no database required: everything runs on plain Node.
 */

import { readFile, writeFile } from "node:fs/promises"
import { parseCsv, toCsv } from "../lib/pension/csv.mjs"
import { EXPORT_COLUMNS, runPipeline, toExportRows } from "../lib/pension/pipeline.mjs"
import { RULES_AS_OF, SUPPORTED_STATES } from "../lib/pension/rules.mjs"

const USAGE = `
Pension Signal Automation

  node scripts/pension-signals.mjs --input <leads.csv> [options]

Options
  --input,  -i   Raw leads CSV (required)
  --output, -o   Where to write actionable signals   (default: active_pension_signals.csv)
  --rejects      Also write the rows that did not qualify, with the reason
  --as-of        Evaluate as of this date, YYYY-MM-DD  (default: today)
  --min-score    Only export leads at or above this score, 0-100 (default: 0)
  --all          Export every row, not just actionable signals
  --json         Print the run summary as JSON instead of text

States covered: ${SUPPORTED_STATES.join(", ")} (rules as of ${RULES_AS_OF})
`

function parseArgs(argv) {
  const args = { output: "active_pension_signals.csv", minScore: 0 }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]
    if (arg === "--input" || arg === "-i") args.input = next()
    else if (arg === "--output" || arg === "-o") args.output = next()
    else if (arg === "--rejects") args.rejects = next()
    else if (arg === "--as-of") args.asOf = next()
    else if (arg === "--min-score") args.minScore = Number(next())
    else if (arg === "--all") args.all = true
    else if (arg === "--json") args.json = true
    else if (arg === "--help" || arg === "-h") args.help = true
    else if (!args.input) args.input = arg
  }
  return args
}

function formatSummary(manifest, outputPath) {
  const lines = [
    "",
    "  Pension Signal Run",
    "  " + "-".repeat(48),
    `  Leads read................. ${manifest.total + manifest.duplicates}`,
    `  Duplicates removed......... ${manifest.duplicates}`,
    `  Actionable signals......... ${manifest.actionable}`,
    `  Average score.............. ${manifest.averageScore}/100`,
    "",
    "  By signal",
  ]
  for (const [signal, count] of Object.entries(manifest.bySignal).sort((a, b) => b[1] - a[1])) {
    lines.push(`    ${signal.padEnd(28)} ${count}`)
  }
  if (Object.keys(manifest.bySequence).length) {
    lines.push("", "  Outreach sequences (state-scoped)")
    for (const [key, count] of Object.entries(manifest.bySequence).sort((a, b) => b[1] - a[1])) {
      lines.push(`    ${key.padEnd(40)} ${count}`)
    }
  }
  lines.push("", `  Written to ${outputPath}`, "")
  return lines.join("\n")
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.input) {
    console.log(USAGE)
    process.exit(args.input ? 0 : 1)
  }

  const csv = await readFile(args.input, "utf8")
  const { rows } = parseCsv(csv)
  if (rows.length === 0) {
    console.error(`No data rows found in ${args.input}. Is the first line a header?`)
    process.exit(1)
  }

  const { actionable, rejected, manifest } = await runPipeline(rows, {
    asOf: args.asOf,
    minScore: Number.isFinite(args.minScore) ? args.minScore : 0,
  })

  const exported = args.all ? [...actionable, ...rejected] : actionable
  await writeFile(args.output, toCsv(toExportRows(exported), EXPORT_COLUMNS), "utf8")

  if (args.rejects) {
    const columns = [...EXPORT_COLUMNS, "rejectReason"]
    const rows = rejected.map((r) => {
      const row = {}
      for (const column of columns) row[column] = r[column] ?? ""
      return row
    })
    await writeFile(args.rejects, toCsv(rows, columns), "utf8")
  }

  if (args.json) console.log(JSON.stringify({ ...manifest, output: args.output }, null, 2))
  else console.log(formatSummary(manifest, args.output))
}

main().catch((error) => {
  console.error(`Run failed: ${error.message}`)
  process.exit(1)
})
