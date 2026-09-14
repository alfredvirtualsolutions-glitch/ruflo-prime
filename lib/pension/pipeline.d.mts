import type { NormalizedLead, SignalResult } from "./engine.d.mts"

export type EmailVerification = { status: "valid" | "risky" | "invalid" | "unknown"; reason?: string; score?: number }

export type Manifest = {
  total: number
  duplicates: number
  actionable: number
  averageScore: number
  bySignal: Record<string, number>
  byState: Record<string, number>
  bySequence: Record<string, number>
}

export type PipelineOptions = {
  asOf?: string | Date
  thresholds?: { approaching?: number; nearTerm?: number }
  minScore?: number
  suppressInvalidEmail?: boolean
  enrich?: (lead: NormalizedLead) => Promise<Partial<NormalizedLead> | null | undefined>
  verifyEmail?: (email: string) => EmailVerification | Promise<EmailVerification>
}

export type PipelineOutput = {
  results: SignalResult[]
  actionable: SignalResult[]
  rejected: Array<SignalResult & { rejectReason: string }>
  duplicates: NormalizedLead[]
  manifest: Manifest
}

export const EXPORT_COLUMNS: string[]

export function heuristicVerifyEmail(email: unknown): EmailVerification
export function runPipeline(rows: Array<Record<string, unknown>>, options?: PipelineOptions): Promise<PipelineOutput>
export function buildManifest(results: SignalResult[], actionable: SignalResult[], duplicates?: unknown[]): Manifest
export function toExportRows(results: SignalResult[]): Array<Record<string, unknown>>
