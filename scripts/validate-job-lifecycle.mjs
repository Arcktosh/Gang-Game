#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const schema = read('packages/db/src/schema/index.ts');
for (const snippet of [
  "export const jobStatus = pgEnum('job_status'",
  "export const characterJobs = pgTable(",
  "shiftsCompleted: integer('shifts_completed')",
  "totalEarned: integer('total_earned')",
]) {
  if (!schema.includes(snippet)) {
    errors.push(`Schema missing job lifecycle snippet: ${snippet}`);
  }
}

const migration = read('packages/db/drizzle/0030_job_lifecycle.sql');
for (const snippet of [
  'CREATE TYPE job_status',
  'CREATE TABLE character_jobs',
  'CREATE UNIQUE INDEX character_jobs_one_active_per_character_idx',
]) {
  if (!migration.includes(snippet)) {
    errors.push(`Job lifecycle migration missing: ${snippet}`);
  }
}

const validators = read('packages/validators/src/index.ts');
if (!validators.includes("action: z.enum(['apply', 'work', 'resign'])")) {
  errors.push('Job action validator must support apply, work, and resign actions.');
}

const route = read('apps/web/src/app/api/jobs/route.ts');
for (const snippet of [
  'body.data.action === \'apply\'',
  'body.data.action === \'resign\'',
  "type: 'job_applied'",
  "type: 'job_resigned'",
  "type: promoted ? 'job_promoted' : 'job_completed'",
  'shiftsCompleted: nextShiftsCompleted',
]) {
  if (!route.includes(snippet)) {
    errors.push(`Jobs route missing lifecycle behavior: ${snippet}`);
  }
}

const page = read('apps/web/src/app/(game)/jobs/page.tsx');
for (const snippet of ['Current employment', 'Apply for a job before working shifts', '<code>apply</code>', '<code>work</code>', '<code>resign</code>']) {
  if (!page.includes(snippet)) {
    errors.push(`Jobs page missing lifecycle UI snippet: ${snippet}`);
  }
}

if (errors.length > 0) {
  console.error('Job lifecycle validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Job lifecycle validation passed: employment state, apply/work/resign route handling, promotion events, and jobs page visibility are wired.');
