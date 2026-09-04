export type CsvRow = Record<string, string>

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] }
export function parseRows(text: string): string[][]
export function normalizeHeader(header: string): string
export function toCsv(records: Array<Record<string, unknown>>, columns?: string[]): string
