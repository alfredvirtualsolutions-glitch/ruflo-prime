/**
 * Dependency-free RFC 4180 CSV reader/writer.
 * Kept in plain ESM so the same code runs in the Next.js app, in Node scripts,
 * and inside a Cloudflare Worker without a build step.
 */

/** Parse CSV text into an array of row objects keyed by normalized header. */
export function parseCsv(text) {
  const rows = parseRows(text)
  if (rows.length === 0) return { headers: [], rows: [] }
  const headers = rows[0].map((h) => h.trim())
  const keys = headers.map(normalizeHeader)
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    if (cells.length === 1 && cells[0].trim() === "") continue
    const record = {}
    for (let c = 0; c < keys.length; c++) record[keys[c]] = (cells[c] ?? "").trim()
    out.push(record)
  }
  return { headers, rows: out }
}

/** Split CSV text into a matrix of raw cells, honouring quotes and embedded newlines. */
export function parseRows(text) {
  const src = text.replace(/^﻿/, "")
  const rows = []
  let row = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ",") { row.push(cell); cell = ""; continue }
    if (ch === "\r") continue
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue }
    cell += ch
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row) }
  return rows
}

/** Lowercase / underscore a header so "First Name" and "first_name" both work. */
export function normalizeHeader(header) {
  return String(header).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

/** Serialize an array of objects to CSV text using the given column order. */
export function toCsv(records, columns) {
  const cols = columns ?? Array.from(new Set(records.flatMap((r) => Object.keys(r))))
  const lines = [cols.map(escapeCell).join(",")]
  for (const record of records) lines.push(cols.map((c) => escapeCell(record[c])).join(","))
  return lines.join("\n") + "\n"
}

function escapeCell(value) {
  if (value === null || value === undefined) return ""
  const str = String(value)
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}
