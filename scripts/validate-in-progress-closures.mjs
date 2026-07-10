#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`Missing ${relativePath}.`);
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
}

const messagesPage = read('apps/web/src/app/(game)/messages/page.tsx');
const livePanel = read('apps/web/src/features/game/message-live-panel.tsx');
const globals = read('apps/web/src/app/globals.css');

const requiredMessageSnippets = [
  'MessageLivePanel',
  "action: 'mark_thread_read'",
  "action: 'mute_thread'",
  "action: 'leave_thread'",
  "action: 'report'",
  "action: 'block'",
  "action: 'unblock'",
  'possibleRecipients',
  'Report history',
  'Block controls',
];

for (const snippet of requiredMessageSnippets) {
  if (!messagesPage.includes(snippet)) {
    errors.push(`Messages page is missing in-progress completion snippet: ${snippet}`);
  }
}

for (const snippet of ['use client', 'EventSource', '/api/messages/stream', 'message.snapshot', 'message.heartbeat', 'aria-live']) {
  if (!livePanel.includes(snippet)) {
    errors.push(`Message live panel is missing snippet: ${snippet}`);
  }
}

if (!globals.includes('.action-grid')) {
  errors.push('Global responsive styles are missing .action-grid for compact message controls.');
}

const packageJson = JSON.parse(read('package.json'));
if (!String(packageJson.scripts?.['validate:static'] ?? '').includes('scripts/validate-in-progress-closures.mjs')) {
  errors.push('validate:static does not include scripts/validate-in-progress-closures.mjs.');
}

const remainingWork = read('docs/remaining-work.md');
if (!remainingWork.includes('Feature Pass 61 in-progress task update')) {
  errors.push('remaining-work.md is missing Feature Pass 61 in-progress task update.');
}
if (!remainingWork.includes('[x] Full Messages page')) {
  errors.push('remaining-work.md does not mark the full Messages page task as completed.');
}

if (errors.length > 0) {
  console.error('In-progress closure validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('In-progress closure validation passed: Messages page live updates and social safety controls are wired.');
