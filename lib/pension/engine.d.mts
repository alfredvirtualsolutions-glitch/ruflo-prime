import type { PensionRule } from "./rules.d.mts"

export type SignalCode =
  | "ELIGIBLE_NOW"
  | "MILESTONE_APPROACHING"
  | "EARLY_RETIREMENT_CANDIDATE"
  | "MILESTONE_WITHIN_5Y"
  | "MONITOR"
  | "INSUFFICIENT_DATA"
  | "UNSUPPORTED_STATE"

export type ScoreBreakdown = {
  targetFit: number
  signalStrength: number
  evidence: number
  contactability: number
  total: number
}

export type NormalizedLead = {
  externalId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  state: string
  employer: string
  role: string
  birthDate: string
  hireDate: string
  serviceYears: string
  age: string
  linkedinUrl: string
}

export type SignalResult = Omit<NormalizedLead, "age" | "serviceYears"> & {
  asOf: string
  rulesAsOf: string
  systemId: string
  systemName: string
  tierId: string
  tierLabel: string
  age: number | null
  serviceYears: number | null
  points: number | null
  unreducedRule: string
  yearsToUnreduced: number | null
  unreducedDate: string
  earlyEligibleNow: boolean
  earlyRule: string
  signal: SignalCode
  signalLabel: string
  score: number
  scoreBreakdown: ScoreBreakdown | null
  sequenceKey: string
  cta: string
  dataGaps: string[]
  emailStatus?: string
  emailStatusReason?: string
  rejectReason?: string
}

export type EvaluateOptions = {
  asOf?: string | Date
  thresholds?: { approaching?: number; nearTerm?: number }
}

export const SIGNAL: Record<SignalCode, SignalCode>
export const DEFAULT_THRESHOLDS: { approaching: number; nearTerm: number }
export const ACTIONABLE_SIGNALS: SignalCode[]

export function parseDate(value: unknown): Date | null
export function yearsBetween(from: Date, to: Date): number
export function addYears(date: Date, years: number): Date
export function yearsUntilRule(rule: PensionRule, age: number, service: number): number | null
export function soonestRule(rules: PensionRule[], age: number, service: number): { rule: PensionRule; years: number } | null
export function describeRule(rule: PensionRule, pointsLabel?: string): string
export function normalizeLead(row: Record<string, unknown>): NormalizedLead
export function signalLabel(signal: SignalCode, pointsRuleValue: number | null): string
export function looksLikeEmail(value: unknown): boolean
export function digitsOnly(value: unknown): string
export function evaluateLead(row: Record<string, unknown>, options?: EvaluateOptions): SignalResult
export function isActionable(result: SignalResult, minScore?: number): boolean
