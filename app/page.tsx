"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Command,
  Database,
  FileText,
  Gauge,
  Inbox,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Network,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";

const workers = [
  { name: "Hermes", role: "Orchestrator / COO", detail: "Routes work, retries, reports", icon: Network, tone: "cyan", status: "Routing" },
  { name: "Prime", role: "Supervisor / QA Gate", detail: "Judges evidence and eligibility", icon: ShieldCheck, tone: "blue", status: "Gating" },
  { name: "DeepSeek", role: "Execution Worker", detail: "Extracts, enriches, normalizes", icon: Database, tone: "amber", status: "Processing" },
  { name: "Gemma", role: "Research & Verification", detail: "Challenges sources and confidence", icon: Search, tone: "violet", status: "Verifying" },
  { name: "Nova", role: "Communications Worker", detail: "Personalizes and classifies replies", icon: Send, tone: "pink", status: "Ready" },
];

const pipeline = [
  { id: "01", title: "Signal discovery", owner: "Gemma", count: "14", icon: Inbox, tone: "violet" },
  { id: "02", title: "Signal verification", owner: "Gemma", count: "09", icon: ShieldCheck, tone: "cyan" },
  { id: "03", title: "Contact extraction", owner: "DeepSeek", count: "07", icon: Database, tone: "amber" },
  { id: "04", title: "Enrichment + validation", owner: "DeepSeek", count: "05", icon: Zap, tone: "orange" },
  { id: "05", title: "Outreach prep", owner: "Nova", count: "03", icon: Send, tone: "pink" },
  { id: "06", title: "Daily report", owner: "Hermes", count: "01", icon: FileText, tone: "blue" },
];

const initialTasks = [
  { title: "Retirement signal needs evidence review", meta: "Gemma · San Diego Unified · 0.78 confidence", tag: "REVIEW", tone: "review", time: "09:42" },
  { title: "Approve 3 verified contacts for enrichment", meta: "Prime · Ryan Cahill Campaign", tag: "APPROVAL", tone: "approval", time: "10:15" },
  { title: "Check Nova draft: pension transition message", meta: "Prime · Evidence-linked personalization", tag: "QA GATE", tone: "qa", time: "11:30" },
  { title: "Investigate conflicting district source", meta: "Hermes · Escalated from Gemma", tag: "HUMAN", tone: "human", time: "14:00" },
];

const toneClasses: Record<string, string> = {
  violet: "tone-violet",
  cyan: "tone-cyan",
  blue: "tone-blue",
  amber: "tone-amber",
  orange: "tone-orange",
  pink: "tone-pink",
};

export default function Home() {
  const [activePipeline, setActivePipeline] = useState("Signal discovery");
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const filteredTasks = useMemo(() => tasks.filter((task) => `${task.title} ${task.meta}`.toLowerCase().includes(query.toLowerCase())), [tasks, query]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar px-4 py-5 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3 px-2"><div className="brand-mark"><Command /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">VBS OS</p><p className="font-semibold tracking-tight">Operator console</p></div></div>
          <div className="campaign-chip mb-6"><span className="status-dot" /><div><p className="font-mono text-[9px] uppercase tracking-widest text-accent">Active campaign</p><p className="mt-1 text-sm font-semibold">Ryan Cahill</p><p className="text-[11px] text-muted-foreground">CA educator retirement signals</p></div></div>
          <nav className="flex flex-col gap-1 text-sm"><button className="nav-item nav-active"><LayoutDashboard /> Command center</button><button className="nav-item"><Target /> Signal inbox <span>14</span></button><button className="nav-item"><Users /> Contacts</button><button className="nav-item"><ClipboardCheck /> QA decisions <span>05</span></button><button className="nav-item"><Activity /> Campaign activity</button></nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4 text-sm"><button className="nav-item"><Settings2 /> System settings</button><div className="mt-5 flex items-center gap-3 rounded-xl bg-muted p-3"><div className="operator-avatar"><UserRound /></div><div className="min-w-0"><p className="truncate text-xs font-medium">Operator</p><p className="truncate text-[10px] text-muted-foreground">QEMU online · 5 workers</p></div><ChevronDown className="ml-auto text-muted-foreground" /></div></div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><button className="icon-button lg:hidden"><Menu /></button><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Wednesday · August 19, 2026 · 09:48 PST</p><h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">OPERATING<br />SYSTEM</h1></div></div><div className="flex items-center gap-2"><span className="host-pill"><span className="status-dot" /> QEMU connected</span><button className="icon-button"><MoreHorizontal /></button><button onClick={() => setShowComposer(true)} className="primary-button hidden sm:flex"><Plus /> New campaign job</button></div></header>

          <div className="flex flex-col gap-6 p-5 sm:p-8">
            <section className="hero-panel"><div><div className="flex items-center gap-2"><span className="eyebrow">Pilot pod · ryan_cahill</span><span className="live-pill"><span /> LIVE</span></div><h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">One signal-first workflow. Five workers. Only the decisions worth your attention.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Hermes routes the work, Prime judges it, and the right worker handles each step. The pilot is tuned for publicly verifiable retirement and pension signals affecting California educators.</p><div className="mt-5 flex flex-wrap items-center gap-3"><button onClick={() => setRunning(!running)} className="primary-button">{running ? <><Circle className="fill-current" /> Pipeline running</> : <><Play /> Run morning discovery</>}</button><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">6 daily jobs · evidence required</span></div></div><div className="hero-architecture"><Image src="/agent-architecture.png" alt="VBS OS agent architecture showing Hermes, Gemma, DeepSeek, Prime, and Nova reporting to the operator" fill sizes="(max-width: 900px) 70vw, 420px" className="object-contain" priority /></div></section>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Verified signals" value="09" delta="+4 since yesterday" icon={CheckCircle2} tone="cyan" /><Metric label="Awaiting Prime" value="05" delta="Needs a decision" icon={ShieldCheck} tone="blue" /><Metric label="Outreach ready" value="03" delta="Evidence-linked" icon={Send} tone="pink" /><Metric label="System confidence" value="86%" delta="+6.2% this week" icon={Gauge} tone="amber" /></div>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><Sparkles className="text-accent" /><h2 className="text-lg font-semibold">Ryan campaign pipeline</h2></div><p className="mt-1 text-sm text-muted-foreground">Every job carries client_id, evidence, confidence, Prime decision, and next action.</p></div><span className="contract-pill">CONTRACT · ryan_cahill</span></div><div className="pipeline-grid mt-5">{pipeline.map((step, index) => { const Icon = step.icon; return <button key={step.title} onClick={() => setActivePipeline(step.title)} className={`pipeline-stage ${activePipeline === step.title ? "pipeline-selected" : ""}`}><div className={`stage-icon ${toneClasses[step.tone]}`}><Icon /></div><p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{step.id} · {step.owner}</p><p className="text-xs font-semibold leading-4">{step.title}</p><span className="stage-count">{step.count}</span>{index < pipeline.length - 1 && <ArrowRight className="pipeline-arrow" />}</button>; })}</div><div className="flow-status"><span className="flow-node cyan-dot" /> discovered <ArrowRight /><span className="flow-node blue-dot" /> verified <ArrowRight /><span className="flow-node amber-dot" /> enriched <ArrowRight /><span className="flow-node pink-dot" /> outreach_ready <ArrowRight /><span className="flow-node violet-dot" /> human review only</div></section>

            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]"><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Master workflow</h2><p className="text-sm text-muted-foreground">The routing contract Hermes is running today.</p></div><span className="font-mono text-[10px] uppercase tracking-widest text-accent">6 jobs / daily</span></div><div className="workflow-list"><WorkflowRow number="01" title="Morning signal discovery" owner="Hermes → Gemma" status="Active" tone="active" /><WorkflowRow number="02" title="Verification + contact extraction" owner="Gemma → DeepSeek" status="Queued" tone="queued" /><WorkflowRow number="03" title="Enrichment + validation" owner="DeepSeek" status="Scheduled" tone="scheduled" /><WorkflowRow number="04" title="Qualification + outreach gate" owner="Prime" status="Awaiting" tone="awaiting" /><WorkflowRow number="05" title="Personalized outreach prep" owner="Nova → Prime" status="Blocked" tone="blocked" /><WorkflowRow number="06" title="End-of-day client report" owner="Hermes" status="Scheduled" tone="scheduled" /></div></section><section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Worker fleet</h2><p className="text-sm text-muted-foreground">Clear jobs. No model sprawl.</p></div><button className="icon-button"><MoreHorizontal /></button></div><div className="flex flex-col gap-2">{workers.map((worker) => { const Icon = worker.icon; return <div key={worker.name} className="agent-row"><div className={`agent-avatar ${toneClasses[worker.tone]}`}><Icon /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{worker.name}</p><span className="online-dot" /></div><p className="truncate text-xs text-muted-foreground">{worker.role}</p><p className="truncate text-[10px] text-muted-foreground/70">{worker.detail}</p></div><span className="font-mono text-[9px] uppercase tracking-widest text-accent">{worker.status}</span></div>; })}</div></section></div>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Operator queue</h2><span className="count-badge">{tasks.length}</span></div><p className="text-sm text-muted-foreground">Prime stops the pipeline when evidence, identity, or eligibility is uncertain.</p></div><div className="search-wrap"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search queue" aria-label="Search operator queue" /></div></div><div className="flex flex-col gap-2">{filteredTasks.map((task) => <div key={task.title} className="task-row"><button onClick={() => setTasks((current) => current.filter((item) => item.title !== task.title))} className="task-check" aria-label={`Complete ${task.title}`}><Check /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{task.meta}</p></div><span className={`priority priority-${task.tone}`}>{task.tag}</span><span className="hidden font-mono text-[10px] text-muted-foreground sm:block">{task.time}</span><button className="text-muted-foreground"><MoreHorizontal /></button></div>)}{filteredTasks.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No tasks match your search.</div>}</div></section>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground"><div className="flex items-center gap-2"><span className="system-pulse" /> All systems nominal · Last sync 2 min ago</div><div className="flex gap-4"><button>Activity log</button><button>Campaign config</button><button>v1.1.0-pilot</button></div></footer>
          </div>
        </section>
      </div>
      {showComposer && <div className="modal-backdrop" role="presentation" onClick={() => setShowComposer(false)}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="job-title" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Ryan Cahill · new job</p><h2 id="job-title" className="mt-1 text-xl font-semibold">Create campaign job</h2></div><button className="icon-button" onClick={() => setShowComposer(false)}><X /></button></div><label className="mt-6 flex flex-col gap-2 text-sm font-medium">What should Hermes route?<textarea className="workflow-input" placeholder="e.g. Verify the latest district pension notice" rows={4} /></label><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" onClick={() => setShowComposer(false)}>Cancel</button><button className="primary-button" onClick={() => setShowComposer(false)}><Play /> Queue job</button></div></div></div>}
    </main>
  );
}

function Metric({ label, value, delta, icon: Icon, tone }: { label: string; value: string; delta: string; icon: typeof Activity; tone: string }) { return <div className="metric-card"><div className={`metric-icon ${toneClasses[tone]}`}><Icon /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-accent">{delta}</p></div></div>; }

function WorkflowRow({ number, title, owner, status, tone }: { number: string; title: string; owner: string; status: string; tone: string }) { return <div className="workflow-row"><span className="workflow-number">{number}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{owner}</p></div><span className={`workflow-status status-${tone}`}><span />{status}</span></div>; }

