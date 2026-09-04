# Pension Signal Automation

Turns a raw educator lead list into a scored, CRM-ready manifest of retirement
signals: who is approaching a pension milestone, in which state system, how soon,
and what to say to them.

You do not need to be a developer to run it.

---

## Which platform this runs on, and why

You asked about Databricks, Neon, or Cloudflare. This is built on **Neon**,
because your app already uses it — `lib/db` connects to Neon through
`DATABASE_URL`, and the pension tables sit next to your existing ones. Nothing
new to buy, sign up for, or learn.

| Option | Verdict |
| --- | --- |
| **Neon + this Next.js app** ✅ | Already wired up. Your leads, signals, login, and dashboard live in one place. |
| Cloudflare Workers | Would work — the engine is dependency-free and Workers-compatible — but it means a second deploy target and a second copy of your data. |
| Databricks | Built for millions of rows and data-science workloads. Educator lead lists are thousands of rows. It would cost more and do less here. |

The scoring engine (`lib/pension/*.mjs`) is deliberately plain JavaScript with
zero dependencies, so if you ever *do* move to Cloudflare or Databricks, the
rules move with you unchanged.

---

## Two ways to run it

### 1. On your computer, no setup (fastest way to see it work)

```bash
node scripts/pension-signals.mjs --input examples/raw_educator_leads.csv --output signals.csv
```

Open `signals.csv` in Excel or Google Sheets. That is your outreach list.

Useful flags:

| Flag | What it does |
| --- | --- |
| `--input`, `-i` | Your raw leads CSV |
| `--output`, `-o` | Where to write qualifying leads |
| `--rejects rejects.csv` | Also write the leads that did *not* qualify, with the reason |
| `--min-score 70` | Only export leads scoring 70 or better out of 100 |
| `--as-of 2027-01-15` | Ask "who will be a signal on this future date?" |
| `--all` | Export every row, qualified or not |

### 2. Inside your app (shared, with a dashboard and a schedule)

1. **Create the tables.** Open your Neon dashboard → SQL Editor → paste the
   contents of `drizzle/0001_pension_signals.sql` → Run. (Once, ever.)
2. **Deploy** as usual. Sign in and go to `/pension`.
3. **Upload a CSV** on that page. You get the manifest, the scores, and an
   **Export CRM CSV** button.
4. **Let it re-run itself.** `vercel.json` schedules `/api/pension/run` for
   weekdays at 13:00 UTC. Set a `CRON_SECRET` environment variable to switch it
   on — the route refuses to run without one. Milestones move with the calendar,
   so a lead who was "five years out" yesterday becomes "approaching" on their
   own; the daily run catches that with no new data.

---

## What your CSV needs

The first row must be column names. Naming is flexible — `First Name`,
`first_name`, and `FIRSTNAME` all work.

| Information | Accepted column names | Needed? |
| --- | --- | --- |
| First / last name | `first_name`, `last_name`, `first`, `surname` | Recommended |
| Email | `email`, `email_address`, `work_email` | Recommended |
| Phone | `phone`, `mobile`, `cell` | Optional |
| State | `state`, `st` | **Required** |
| District / employer | `district`, `employer`, `school`, `organization` | Recommended |
| Job title | `title`, `role`, `position` | **Required in California** (splits CalSTRS vs CalPERS) |
| Date of birth | `dob`, `birth_date`, `date_of_birth` | **Required** (or `age`) |
| Hire date | `hire_date`, `start_date` | **Required** (sets the pension tier) |
| Years of service | `years_of_service`, `service_years` | Optional (otherwise derived from hire date) |

Dates can be `1970-09-04`, `9/4/1970`, or just `1970`.

A lead missing a birth date or hire date is reported as **Insufficient Data**
with the exact gap named. It is never guessed at.

`examples/raw_educator_leads.csv` is a working example to copy.

---

## What comes out

Each lead is classified into one signal:

| Signal | Meaning |
| --- | --- |
| **Eligible Now (Unreduced)** | Already past the full-benefit milestone. Highest urgency. |
| **Rule of 80 Approaching** | Hits the milestone within 2 years. The planning conversation. |
| **Early Retirement Candidate** | Can retire now at a reduced benefit, full benefit still years away. |
| **Milestone Within 5 Years** | Worth nurturing now. |
| **Monitor** | Too early. Kept, not contacted. |
| **Insufficient Data** | Missing dates. The gap is named so it can be enriched. |
| **Unsupported State** | No rules configured for that state. Flagged, never guessed. |

Plus, for every lead: the pension system and tier, age, years of service, points,
the exact rule that governs them, the projected milestone date, a 0–100 score,
an outreach sequence key, and a personalized call to action.

### How the 0–100 score works

| Component | Max | Based on |
| --- | --- | --- |
| Target fit | 30 | Known pension system, job title, employer |
| Signal strength | 35 | How close the unreduced milestone is |
| Evidence quality | 20 | Birth date, hire date, service years present |
| Contactability | 15 | Valid-looking email, usable phone |

### Outreach routing

Every qualifying lead gets a `sequenceKey` like `AZ_ASRS__MILESTONE_APPROACHING`.
Point each key at its own email sequence in your CRM and Arizona messaging can
never reach a Texas or California member.

---

## States and rules covered

| State | System | Tiers |
| --- | --- | --- |
| Arizona | ASRS | Rule of 80 (hired before Jul 2011) / Rule of 85 (after) |
| Texas | TRS | Tier 1, Tiers 2–4, Tiers 5–6 (Rule of 80 with age floors) |
| Nevada | PERS | Pre-2010, 2010–2015, post-2015 |
| California | CalSTRS | 2% at 60 and 2% at 62 (PEPRA) — certificated staff |
| California | CalPERS | Classic and PEPRA school members — classified staff |

**Please read this part.** The rules live in `lib/pension/rules.mjs`, written as
plain settings with a comment explaining each tier, so they can be corrected
without touching any logic. They reflect publicly documented plan rules as of the
`RULES_AS_OF` date at the top of that file. Pension plans change, and projections
here assume uninterrupted service. Treat every output as a **prospecting signal,
not advice** — confirm eligibility against the member's own plan statement before
any client conversation.

To add a state, copy an existing block in `rules.mjs` and change the numbers. To
widen or narrow the outreach window, change `DEFAULT_THRESHOLDS` in
`lib/pension/engine.mjs` (`approaching: 2` years, `nearTerm: 5` years).

---

## Connecting enrichment and email verification

The pipeline has two optional plug-in points, so no vendor is hard-wired. Until
one is connected, the run uses local checks only (syntax, role-based mailboxes
like `info@`, non-routable domains) and marks everything else `unknown` rather
than pretending it was verified.

```js
import { runPipeline } from "./lib/pension/pipeline.mjs"

await runPipeline(rows, {
  // Fill gaps before scoring — e.g. Apollo, Clearbit, your own database.
  enrich: async (lead) => ({ email: await findEmail(lead), hireDate: await findHireDate(lead) }),

  // Check deliverability before anything is sent — e.g. Hunter, NeverBounce.
  verifyEmail: async (email) => ({ status: "valid" }), // "valid" | "risky" | "invalid" | "unknown"
})
```

Anything returning `invalid` is suppressed from the export automatically. If a
vendor errors or times out, the run continues and marks that lead `unknown` —
one bad API call never loses a whole batch.

---

## API reference

| Endpoint | Purpose |
| --- | --- |
| `POST /api/pension/ingest` | Upload a CSV (raw body, `multipart/form-data`, or `{"csv": "..."}`). Signed-in users only. Returns the run manifest. |
| `GET /api/pension/export` | The newest run as a CRM-ready CSV. Add `?all=1` for non-qualifying rows too. |
| `GET,POST /api/pension/run` | Re-scores every stored lead against today's date. Requires `Authorization: Bearer $CRON_SECRET`. |

---

## Checking it still works

```bash
node --test tests/pension.test.mjs
```

30 tests cover the CSV reader, date parsing, every rule kind, tier boundaries,
the CalSTRS/CalPERS split, each signal classification, scoring, deduplication,
adapter failures, and export shape. Run this after editing `rules.mjs` — if you
mistype a rule, a test will tell you.
