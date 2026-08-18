"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Command,
  Database,
  FileText,
  Filter,
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

const stages = [
  { number: "01", title: "Signal Discovery", count: "24", color: "violet", icon: Inbox },
  { number: "02", title: "Verify & Identify", count: "18", color: "cyan", icon: ShieldCheck },
  { number: "03", title: "Extract & Enrich", count: "12", color: "blue", icon: Database },
  { number: "04", title: "Score & Qualify", count: "08", color: "amber", icon: Gauge },
  { number: "05", title: "Outreach & Prepare", count: "05", color: "orange", icon: Send },
  { number: "06", title: "Responses & Engage", count: "03", color: "pink", icon: Activity },
  { number: "07", title: "Report & Optimize", count: "01", color: "purple", icon: BarChart3 },
];

const agents = [
  { name: "Hermes", role: "Orchestrator", detail: "Plans, routes, monitors", icon: Network, color: "violet", status: "Listening" },
  { name: "Prime Agent", role: "Quality Gate", detail: "Validates, scores, filters", icon: ShieldCheck, color: "cyan", status: "Executing" },
  { name: "DeepSeek Flash", role: "Execution Engine", detail: "Extracts, enriches, drafts", icon: Zap, color: "blue", status: "Processing" },
];

const initialTasks = [
  { title: "Review qualified leads from yesterday", owner: "Hermes", stage: "Score & Qualify", priority: "High", time: "09:15" },
  { title: "Enrich Northstar account profile", owner: "DeepSeek Flash", stage: "Extract & Enrich", priority: "Medium", time: "10:30" },
  { title: "Approve Q3 outreach sequence", owner: "You", stage: "Outreach & Prepare", priority: "Approval", time: "11:00" },
  { title: "Summarize open conversations", owner: "Prime Agent", stage: "Responses & Engage", priority: "Low", time: "13:45" },
];

const colorClasses: Record<string, string> = {
  violet: "agent-violet",
  cyan: "agent-cyan",
  blue: "agent-blue",
  amber: "agent-amber",
  orange: "agent-orange",
  pink: "agent-pink",
  purple: "agent-purple",
};

export default function Home() {
  const [activeStage, setActiveStage] = useState("All activity");
  const [tasks, setTasks] = useState(initialTasks);
  const [showComposer, setShowComposer] = useState(false);
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => `${task.title} ${task.owner} ${task.stage}`.toLowerCase().includes(query.toLowerCase())),
    [tasks, query],
  );

  function completeTask(title: string) {
    setTasks((current) => current.filter((task) => task.title !== title));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar px-4 py-5 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Command /></div>
            <div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Personal</p><p className="font-semibold tracking-tight">VBS OS</p></div>
          </div>
          <nav className="flex flex-col gap-1 text-sm">
            <button className="nav-item nav-active"><LayoutDashboard /> Command Center</button>
            <button className="nav-item"><Target /> Opportunities <span>24</span></button>
            <button className="nav-item"><Users /> Contacts</button>
            <button className="nav-item"><FileText /> Knowledge Base</button>
            <button className="nav-item"><BarChart3 /> Performance</button>
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4 text-sm">
            <button className="nav-item"><Settings2 /> System Settings</button>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-muted p-3"><div className="flex size-8 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary"><UserRound /></div><div className="min-w-0"><p className="truncate text-xs font-medium">Operator</p><p className="truncate text-[10px] text-muted-foreground">Online · 3 agents active</p></div><ChevronDown className="ml-auto text-muted-foreground" /></div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-border px-5 sm:px-8">
            <div className="flex items-center gap-3"><button className="icon-button lg:hidden"><Menu /></button><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Wednesday · August 19, 2026</p><h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Good morning, operator.</h1></div></div>
            <div className="flex items-center gap-2"><button className="icon-button"><Bell /><span className="notification-dot" /></button><button onClick={() => setShowComposer(true)} className="primary-button hidden sm:flex"><Plus /> New workflow</button><button className="icon-button"><MoreHorizontal /></button></div>
          </header>

          <div className="flex flex-col gap-6 p-5 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Active signals" value="24" delta="+18.4%" icon={Activity} tone="violet" />
              <Metric label="Qualified today" value="08" delta="+3 this week" icon={CheckCircle2} tone="cyan" />
              <Metric label="Awaiting approval" value="05" delta="Needs you" icon={AlertTriangle} tone="amber" />
              <Metric label="System efficiency" value="94.2%" delta="+2.1%" icon={Gauge} tone="blue" />
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Sparkles className="text-primary" /><h2 className="text-lg font-semibold">Operating pipeline</h2><span className="live-pill"><span /> LIVE</span></div><p className="mt-1 text-sm text-muted-foreground">From raw signals to decisions that move your day forward.</p></div><button className="secondary-button" onClick={() => setRunning(!running)}>{running ? <><Circle className="fill-current" /> Running</> : <><Play /> Run pipeline</>}</button></div>
              <div className="pipeline-grid">{stages.map((stage, index) => { const Icon = stage.icon; return <button key={stage.title} onClick={() => setActiveStage(stage.title)} className={`pipeline-stage ${activeStage === stage.title ? "pipeline-selected" : ""}`}><div className={`stage-icon ${colorClasses[stage.color]}`}><Icon /></div><div className="min-w-0 text-left"><p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{stage.number}</p><p className="mt-1 truncate text-xs font-semibold">{stage.title}</p></div><span className="stage-count">{stage.count}</span>{index < stages.length - 1 && <ArrowUpRight className="pipeline-arrow" />}</button> })}</div>
              <div className="flow-status"><span className="flow-node violet-dot" /> Raw signals <ArrowUpRight /><span className="flow-node cyan-dot" /> Verified leads <ArrowUpRight /><span className="flow-node blue-dot" /> Enriched leads <ArrowUpRight /><span className="flow-node amber-dot" /> Qualified leads <ArrowUpRight /><span className="flow-node orange-dot" /> Outreach queue</div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Today&apos;s operating rhythm</h2><p className="text-sm text-muted-foreground">Your system is moving through the day with you.</p></div><button className="text-muted-foreground"><MoreHorizontal /></button></div><div className="flex flex-col gap-3">{["Morning · Discovery & Intelligence", "Midday · Enrichment & Qualification", "Afternoon · Outreach Preparation", "Evening · Responses & Engagement"].map((item, index) => <div key={item} className={`rhythm-row ${index === 0 ? "rhythm-active" : ""}`}><div className={`rhythm-time ${index === 3 ? "moon" : ""}`}>{index === 3 ? "NIGHTLY" : ["09:00", "12:00", "15:00"][index]}</div><div className="rhythm-line" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item}</p><p className="mt-1 text-xs text-muted-foreground">{index === 0 ? "Hermes + PrimeSeek" : index === 1 ? "DeepSeek + Prime" : index === 2 ? "PrimeSeek + Hermes" : "Hermes + PrimeSeek"}</p></div><span className="hidden rounded-full bg-muted px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground sm:block">{index === 0 ? "Active" : index === 3 ? "Scheduled" : "Complete"}</span></div>)}</div></section>
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Agent fleet</h2><p className="text-sm text-muted-foreground">Three minds, one operating system.</p></div><button className="text-muted-foreground"><MoreHorizontal /></button></div><div className="flex flex-col gap-3">{agents.map((agent) => { const Icon = agent.icon; return <div key={agent.name} className="agent-row"><div className={`agent-avatar ${colorClasses[agent.color]}`}><Icon /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{agent.name}</p><span className="online-dot" /></div><p className="truncate text-xs text-muted-foreground">{agent.role} · {agent.detail}</p></div><span className="font-mono text-[9px] uppercase tracking-widest text-primary">{agent.status}</span></div> })}</div><button className="secondary-button mt-5 w-full justify-center"><Settings2 /> Configure agents</button></section>
            </div>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Operator queue</h2><span className="count-badge">{tasks.length}</span></div><p className="text-sm text-muted-foreground">Your attention is the final quality gate.</p></div><div className="flex items-center gap-2"><div className="search-wrap"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search queue" /></div><button className="icon-button"><Filter /></button></div></div><div className="flex flex-col gap-2">{filteredTasks.map((task) => <div key={task.title} className="task-row"><button onClick={() => completeTask(task.title)} className="task-check" aria-label={`Complete ${task.title}`}><Check /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{task.owner} · {task.stage}</p></div><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span><span className="hidden font-mono text-[10px] text-muted-foreground sm:block">{task.time}</span><button className="text-muted-foreground"><MoreHorizontal /></button></div>)}{filteredTasks.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No tasks match your search.</div>}</div></section>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground"><div className="flex items-center gap-2"><span className="system-pulse" /> All systems nominal · Last sync 2 min ago</div><div className="flex gap-4"><button>Activity log</button><button>Help center</button><button>v1.0.4</button></div></footer>
          </div>
        </section>
      </div>
      {showComposer && <div className="modal-backdrop" role="presentation" onClick={() => setShowComposer(false)}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="workflow-title" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-widest text-primary">New operation</p><h2 id="workflow-title" className="mt-1 text-xl font-semibold">Create a workflow</h2></div><button className="icon-button" onClick={() => setShowComposer(false)}><X /></button></div><label className="mt-6 flex flex-col gap-2 text-sm font-medium">What should the system handle?<textarea className="workflow-input" placeholder="e.g. Prepare my client follow-up queue for tomorrow" rows={4} /></label><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" onClick={() => setShowComposer(false)}>Cancel</button><button className="primary-button" onClick={() => setShowComposer(false)}><Play /> Start workflow</button></div></div></div>}
    </main>
  );
}

function Metric({ label, value, delta, icon: Icon, tone }: { label: string; value: string; delta: string; icon: typeof Activity; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${colorClasses[tone]}`}><Icon /></div><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-primary">{delta}</p></div><ArrowUpRight className="ml-auto text-muted-foreground" /> </div>;
}
