# Pension Signal Automation — build log

**Goal:** the automation from the three infographics — raw educator leads in,
state-specific retirement signals with personalized CTAs out — running somewhere
real, operable by a non-developer.

## Platform decision

Built on **Neon**, inside the existing Next.js app.

- The repo already ships `drizzle-orm` + `pg` against `DATABASE_URL`, and an
  auth + dashboard shell. The pension tables sit beside the existing ones.
- Cloudflare Workers would run the engine fine (it is dependency-free ESM) but
  adds a second deploy target and a second copy of the data.
- Databricks is sized for millions of rows and analytics workloads; educator
  lead lists are thousands of rows.

Portability was kept anyway: the whole engine is plain `.mjs` with zero
dependencies, so it runs unchanged in Node, in Next.js, or in a Worker.

## Plan and status

- [x] Dependency-free CSV reader/writer (`lib/pension/csv.mjs`)
- [x] State pension rules as editable data, not code (`lib/pension/rules.mjs`)
      — AZ ASRS, TX TRS, NV PERS, CA CalSTRS, CA CalPERS, with tiers
- [x] Signal engine: age/service/points, milestone projection, classification,
      0–100 score, state-specific CTA (`lib/pension/engine.mjs`)
- [x] Four-phase pipeline with pluggable enrichment and email verification
      adapters, dedupe, suppression, ranking, manifest (`lib/pension/pipeline.mjs`)
- [x] Zero-setup CLI (`scripts/pension-signals.mjs`) + sample data
- [x] Neon tables, migration SQL, persistence layer (upsert on dedupe key)
- [x] `POST /api/pension/ingest`, `GET /api/pension/export`, cron `/api/pension/run`
- [x] `/pension` dashboard: upload, metrics, sequence routing, ranked manifest
- [x] Weekday cron in `vercel.json`, gated on `CRON_SECRET`
- [x] 30 tests, non-developer guide, README

## Verification

| Check | Result |
| --- | --- |
| `node --test tests/pension.test.mjs` | 30 passed, 0 failed |
| `npx tsc --noEmit` | clean, except a pre-existing `LayoutProps` error in `app/layout.tsx` |
| `npx eslint .` | clean |
| `npx next build` | compiled; all 4 new routes present |
| CLI end to end on the sample list | 10 leads → 6 actionable, 6 state-scoped sequences |

Not verified in this environment: the API routes and dashboard against a live
Neon database, since no `DATABASE_URL` was reachable. The SQL migration and the
queries typecheck and build, but the first real upload is the true test.

## Design decisions worth remembering

1. **Rules are data.** Every eligibility rule is a `{ kind, value }` object with
   a note. Correcting a plan means editing a number, never logic.
2. **Never guess.** A missing hire date yields `INSUFFICIENT_DATA` naming the
   gap; an unconfigured state yields `UNSUPPORTED_STATE`. Neither is scored as
   if it were known.
3. **Reproducible.** Every evaluation takes an explicit `asOf` date, so a run
   can be replayed and tested exactly.
4. **Adapters, not vendors.** Enrichment and email verification are injected
   functions. A vendor failure degrades one lead, never the batch.
5. **State isolation is structural.** The `sequenceKey` carries the pension
   system, so cross-state messaging is impossible by construction.

## Next steps (not built)

- Connect a real email verifier and enrichment provider through the adapters.
- Push the manifest into the CRM directly, instead of exporting CSV.
- Widen state coverage beyond AZ / TX / NV / CA.
