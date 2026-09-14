"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Play, Upload } from "lucide-react"

type Manifest = { total: number; actionable: number; duplicates: number; averageScore: number }

/** Client-side uploader for a raw educator lead CSV. */
export function UploadForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0]
    if (!file) { setError("Choose a CSV file first."); return }

    setBusy(true); setError(null); setMessage(null)
    try {
      const body = new FormData()
      body.append("file", file)
      const minScore = (form.elements.namedItem("minScore") as HTMLInputElement).value
      if (minScore) body.append("minScore", minScore)

      const response = await fetch("/api/pension/ingest", { method: "POST", body })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Upload failed")
      const manifest = payload.manifest as Manifest
      setMessage(`Read ${manifest.total + manifest.duplicates} leads · ${manifest.actionable} actionable signals · average score ${manifest.averageScore}/100.`)
      form.reset()
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Raw leads CSV
        <input type="file" name="file" accept=".csv,text/csv" className="workflow-input" required />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Minimum score to qualify (0-100)
        <input type="number" name="minScore" min={0} max={100} defaultValue={0} className="workflow-input" />
      </label>
      <button type="submit" className="primary-button self-start" disabled={busy}>
        {busy ? <><Play /> Scoring leads…</> : <><Upload /> Run pension signal pass</>}
      </button>
      {message && <p className="text-xs text-accent">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  )
}
