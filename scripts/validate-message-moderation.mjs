#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const errors = [];
const notes = [];

const migrationPath = 'packages/db/drizzle/0042_message_moderation_retention.sql';
if (!fs.existsSync(path.join(repoRoot, migrationPath))) {
  errors.push(`${migrationPath} is missing.`);
} else {
  const migration = read(migrationPath);
  for (const required of [
    'hidden_at',
    'hidden_by_user_id',
    'hidden_reason',
    'retention_expires_at',
    'messages_thread_visible_created_idx',
    'messages_retention_expires_idx',
  ]) {
    if (!migration.includes(required)) {
      errors.push(`${migrationPath} is missing ${required}.`);
    }
  }
}

const schema = read('packages/db/src/schema/index.ts');
for (const required of ['hiddenAt', 'hiddenByUserId', 'hiddenReason', 'retentionExpiresAt']) {
  if (!schema.includes(required)) {
    errors.push(`packages/db/src/schema/index.ts is missing messages.${required}.`);
  }
}

const messagesQuery = read('packages/db/src/queries/messages.ts');
for (const required of [
  'buildMessageRetentionExpiresAt',
  'retentionExpiresAt: buildMessageRetentionExpiresAt()',
  'isNull(messages.hiddenAt)',
  'cleanupExpiredMessages',
  'not exists',
]) {
  if (!messagesQuery.includes(required)) {
    errors.push(`packages/db/src/queries/messages.ts is missing ${required}.`);
  }
}

const adminQuery = read('packages/db/src/queries/admin.ts');
for (const required of ['hideMessage?: boolean', 'hiddenMessage', 'hiddenAt: sql`now()`', 'hidden_reason as "hiddenReason"']) {
  if (!adminQuery.includes(required)) {
    errors.push(`packages/db/src/queries/admin.ts is missing ${required}.`);
  }
}

const adminRoute = read('apps/web/src/app/api/admin/moderation/reports/[reportId]/route.ts');
if (!adminRoute.includes('hideMessage: z.boolean().optional()')) {
  errors.push('Admin moderation report route does not accept hideMessage.');
}

const adminPanel = read('apps/web/src/features/admin/admin-panel.tsx');
for (const required of ['hideMessage', 'Hide message from player inboxes', 'retentionExpiresAt']) {
  if (!adminPanel.includes(required)) {
    errors.push(`Admin panel is missing ${required}.`);
  }
}

const maintenance = read('packages/db/src/maintenance.ts') + read('apps/worker/src/ticks/maintenance-tick.ts');
for (const required of ['cleanupExpiredMessages', 'expiredMessages', 'MESSAGE_RETENTION_DAYS']) {
  if (!maintenance.includes(required)) {
    errors.push(`Maintenance cleanup is missing ${required}.`);
  }
}

const envSchema = read('packages/validators/src/index.ts');
if (!envSchema.includes('MESSAGE_RETENTION_DAYS')) {
  errors.push('Environment validation is missing MESSAGE_RETENTION_DAYS.');
}

const featureChecklist = read('docs/feature-checklist.md');
if (!featureChecklist.includes('Feature Pass 90 - Message moderation and retention')) {
  errors.push('docs/feature-checklist.md is missing Feature Pass 90 notes.');
}

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    errors: errors.length,
    notes: notes.length,
    ok: errors.length === 0,
  },
  notes,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
