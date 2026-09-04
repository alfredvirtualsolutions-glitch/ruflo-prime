export type PensionRule =
  | { kind: "points"; value: number }
  | { kind: "pointsWithMinAge"; value: number; minAge: number }
  | { kind: "age"; value: number; minService?: number }
  | { kind: "ageAndService"; age: number; service: number }
  | { kind: "service"; value: number }

export type PensionTier = {
  id: string
  label: string
  hiredFrom?: string
  hiredBefore?: string
  notes?: string
  unreduced: PensionRule[]
  early?: PensionRule[]
}

export type PensionSystem = {
  id: string
  state: string
  system: string
  name: string
  pointsLabel: string
  appliesToRoles?: string[]
  tiers: PensionTier[]
}

export const RULES_AS_OF: string
export const PENSION_SYSTEMS: PensionSystem[]
export const SUPPORTED_STATES: string[]
export function systemsForState(state: string): PensionSystem[]
export function resolveSystem(state: string, role?: string): PensionSystem | null
export function resolveTier(system: PensionSystem | null, hireDate: Date | null): PensionTier | null
