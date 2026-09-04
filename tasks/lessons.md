# Lessons

## Pension signal engine

- **Two rule expectations I got wrong, caught by tests.** An Arizona post-2011
  member 6 years from an unreduced benefit but already past age 50 with 5 years
  is an *early retirement candidate*, not a "within 5 years" nurture. And a Texas
  Tier 5/6 member reaching 80 points at 50 still waits until 62 — the age floor,
  not the points, sets the date. Both were my test assertions being wrong while
  the engine was right. Hand-verifying each case before editing the test kept a
  correct engine from being "fixed" into a wrong one.
- **Points close at two per year, not one.** Age and service both advance, so a
  member 6 points short of the Rule of 80 is 3 years away, not 6. Getting this
  backwards would have doubled every projection.
- **Plain `.mjs` for shared logic.** Writing the engine as dependency-free ESM
  with hand-written `.d.mts` declarations means the same file runs in the CLI,
  in `node --test`, in Next.js server code, and would run in a Cloudflare Worker
  — with no build step and full TypeScript types.
