import { headers } from "next/headers"
import Link from "next/link"
import { Download, Gauge, ShieldCheck, Target, Users } from "lucide-react"

import { auth } from "@/lib/auth"
import { RULES_AS_OF, SUPPORTED_STATES } from "@/lib/pension/rules.mjs"
import { latestSignals } from "@/lib/pension/store"
import { UploadForm } from "./upload-form"

export const dynamic = "force-dynamic"

export default async function PensionPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Pension signals</h1>
        <p className="mt-3 text-sm text-muted-foreground">Sign in to upload a lead list and see its retirement signals.</p>
        <Link href="/" className="primary-button mt-6 inline-flex">Back to the console</Link>
      </main>
    )
  }

  const { run, signals } = await latestSignals(session.user.id)
  const manifest = (run?.manifest ?? null) as { bySequence?: Record<string, number> } | null

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Signal engine · rules as of {RULES_AS_OF}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Pension signals</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload a raw educator list and every lead is scored against the retirement rules for {SUPPORTED_STATES.join(", ")}.
            Each qualifying lead leaves with its milestone, its score, and a state-specific call to action.
          </p>
        </div>
        {run && (
          <a href="/api/pension/export" className="primary-button"><Download /> Export CRM CSV</a>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Leads in last run" value={run ? String(run.leadsRead) : "—"} icon={Users} />
        <Stat label="Actionable signals" value={run ? String(run.actionable) : "—"} icon={Target} />
        <Stat label="Average score" value={run ? `${run.averageScore}/100` : "—"} icon={Gauge} />
        <Stat label="Duplicates removed" value={run ? String(run.duplicates) : "—"} icon={ShieldCheck} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Run a list</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Any column naming works: first name, last name, email, phone, state, district, title, date of birth, hire date.
        </p>
        <UploadForm />
      </section>

      {manifest?.bySequence && Object.keys(manifest.bySequence).length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Outreach sequences</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Each state routes to its own sequence, so Arizona messaging never reaches a Texas or California member.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(manifest.bySequence).sort((a, b) => b[1] - a[1]).map(([key, count]) => (
              <span key={key} className="contract-pill">{key} · {count}</span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Actionable manifest</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Highest-scoring signals first. These are the rows an outreach sequence should consume.</p>
        {signals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No signals yet. Upload a list above to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <Th>Score</Th><Th>State</Th><Th>System</Th><Th>Tier</Th><Th>Signal</Th><Th>Milestone</Th><Th>Personalized CTA</Th>
                </tr>
              </thead>
              <tbody>
                {signals.map((signal) => (
                  <tr key={signal.id} className="border-t border-border align-top">
                    <Td><span className="font-mono text-xs font-semibold text-accent">{signal.score}</span></Td>
                    <Td>{signal.systemId?.split("_")[0] ?? ""}</Td>
                    <Td>{signal.systemName}</Td>
                    <Td className="text-xs text-muted-foreground">{signal.tierLabel}</Td>
                    <Td>{signal.signalLabel}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {signal.unreducedRule}
                      {signal.unreducedDate ? <><br />≈ {signal.unreducedDate}</> : null}
                    </Td>
                    <Td className="max-w-[360px] text-xs text-muted-foreground">{signal.cta}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Milestones are projected assuming uninterrupted service and are for prospecting only. Confirm eligibility against the member&apos;s
        own plan statement before giving advice.
      </p>
    </main>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="metric-card">
      <div className="metric-icon tone-cyan"><Icon /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 pb-3 font-medium">{children}</th>
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-3 ${className}`}>{children}</td>
}
