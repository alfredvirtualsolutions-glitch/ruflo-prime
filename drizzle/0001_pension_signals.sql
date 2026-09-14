-- Pension signal pipeline tables.
-- Run once against your Neon database (Neon SQL Editor, or `psql "$DATABASE_URL" -f drizzle/0001_pension_signals.sql`).

CREATE TABLE IF NOT EXISTS "pension_runs" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "source" text NOT NULL DEFAULT 'upload',
  "status" text NOT NULL DEFAULT 'complete',
  "asOf" text NOT NULL,
  "leadsRead" integer NOT NULL DEFAULT 0,
  "duplicates" integer NOT NULL DEFAULT 0,
  "actionable" integer NOT NULL DEFAULT 0,
  "averageScore" integer NOT NULL DEFAULT 0,
  "manifest" jsonb,
  "error" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "pension_leads" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "dedupeKey" text NOT NULL,
  "externalId" text,
  "firstName" text,
  "lastName" text,
  "email" text,
  "phone" text,
  "state" text,
  "employer" text,
  "role" text,
  "birthDate" text,
  "hireDate" text,
  "serviceYears" text,
  "linkedinUrl" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "pension_leads_user_dedupe_idx" ON "pension_leads" ("userId", "dedupeKey");

CREATE TABLE IF NOT EXISTS "pension_signals" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "leadId" text NOT NULL,
  "runId" text NOT NULL,
  "systemId" text,
  "systemName" text,
  "tierId" text,
  "tierLabel" text,
  "age" text,
  "serviceYears" text,
  "points" text,
  "signal" text NOT NULL,
  "signalLabel" text NOT NULL,
  "unreducedRule" text,
  "yearsToUnreduced" text,
  "unreducedDate" text,
  "earlyEligibleNow" boolean NOT NULL DEFAULT false,
  "earlyRule" text,
  "score" integer NOT NULL DEFAULT 0,
  "scoreBreakdown" jsonb,
  "emailStatus" text,
  "sequenceKey" text,
  "cta" text,
  "dataGaps" jsonb,
  "actionable" boolean NOT NULL DEFAULT false,
  "rejectReason" text,
  "crmStatus" text NOT NULL DEFAULT 'pending',
  "asOf" text NOT NULL,
  "rulesAsOf" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "pension_signals_user_score_idx" ON "pension_signals" ("userId", "score");
CREATE INDEX IF NOT EXISTS "pension_signals_run_idx" ON "pension_signals" ("runId");
