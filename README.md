# ruflo-prime

Operator console for signal-driven educator outreach, plus the pension signal
automation that feeds it.

## Pension signal automation

Turn a raw educator lead list into a scored, CRM-ready manifest of retirement
signals. Try it right now, with no setup:

```bash
node scripts/pension-signals.mjs --input examples/raw_educator_leads.csv --output signals.csv
```

In the app, the same engine runs at `/pension`: upload a list, review the ranked
manifest, export to your CRM, and let the weekday cron re-score everyone as
milestones move.

**Full guide: [docs/PENSION_AUTOMATION.md](docs/PENSION_AUTOMATION.md)**

## Development

```bash
pnpm install
pnpm dev                              # http://localhost:3000
node --test tests/pension.test.mjs    # pension engine tests
pnpm lint
```

`DATABASE_URL` points at Neon. Apply `drizzle/0001_pension_signals.sql` once to
create the pension tables.
