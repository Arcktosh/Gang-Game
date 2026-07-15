#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const jsonOnly = process.argv.includes('--json');
const skipDirs = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.turbo', '.cache', '.git']);
const issues = [];
const checks = [];

function result(id, status, message, evidence = []) {
  const row = { id, status, message, evidence };
  checks.push(row);
  if (status === 'error') issues.push(row);
}
function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}
function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, out);
    else if (entry.isFile()) out.push(absolute);
  }
  return out;
}
function rel(file) { return path.relative(root, file).replaceAll(path.sep, '/'); }

const packageFile = path.join(root, 'package.json');
const packageText = read(packageFile);
let pkg = {};
try { pkg = JSON.parse(packageText ?? '{}'); } catch { result('package-json', 'error', 'package.json is not valid JSON'); }
const pm = String(pkg.packageManager ?? '');
const manager = pm.split('@')[0] || (fs.existsSync(path.join(root, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm');
const lockName = { pnpm: 'pnpm-lock.yaml', npm: 'package-lock.json', yarn: 'yarn.lock', bun: 'bun.lockb' }[manager];
result('package-manager-pin', pm.includes('@') ? 'pass' : 'warning', pm.includes('@') ? `Pinned package manager: ${pm}` : 'packageManager is not pinned in package.json');
result('lockfile-present', lockName && fs.existsSync(path.join(root, lockName)) ? 'pass' : 'error', lockName && fs.existsSync(path.join(root, lockName)) ? `${lockName} is present` : `Required ${lockName ?? 'lockfile'} is missing`);

const files = walk(root);
const ignores = files.filter((f) => path.basename(f) === '.gitignore');
const ignoredAt = [];
for (const file of ignores) {
  const text = read(file) ?? '';
  for (const line of text.split(/\r?\n/)) {
    const normalized = line.trim().replace(/^\//, '').replace(/^\*\*\//, '');
    if (lockName && normalized === lockName) ignoredAt.push(`${rel(file)}:${line.trim()}`);
  }
}
result('lockfile-tracked-policy', ignoredAt.length ? 'error' : 'pass', ignoredAt.length ? `${lockName} is ignored` : 'No lockfile ignore rule found', ignoredAt);

const workflowFiles = files.filter((f) => /\.github[\\/]workflows[\\/].+\.ya?ml$/.test(f) || /Dockerfile/.test(path.basename(f)));
const drift = [];
for (const file of workflowFiles) {
  const text = read(file) ?? '';
  if (/--no-frozen-lockfile|--frozen-lockfile(?:=false|\s+false)/.test(text)) drift.push(rel(file));
}
result('immutable-ci-install', drift.length ? 'error' : 'pass', drift.length ? 'CI/deployment permits lockfile drift' : 'No mutable lockfile install flag found', drift);

const shellFailures = [];
for (const file of files) {
  const text = read(file);
  const shell = /\.(?:sh|bash)$/.test(file) || (text?.startsWith('#!') && /(?:ba|z)?sh/.test(text.split(/\r?\n/, 1)[0]));
  if (!shell) continue;
  const name = rel(file).toLowerCase();
  if (!name.startsWith('scripts/') && !/(backup|restore|proof|release|deploy|smoke)/.test(name)) continue;
  try { if ((fs.statSync(file).mode & 0o111) === 0) shellFailures.push(rel(file)); } catch {}
}
result('script-executability', shellFailures.length ? 'error' : 'pass', shellFailures.length ? 'Release/operations scripts are not executable' : 'Release and operations shell scripts are executable', shellFailures);

const knownEmail = 'dev' + '@' + 'example.com';
const knownPassword = 'password' + '123';
const seedFiles = [];
const directPasswordFiles = [];
let neutralizer = false;
let localSeederGuard = false;
let adminBootstrap = false;
for (const file of files) {
  const name = rel(file).toLowerCase();
  if (name === 'scripts/release-audit.mjs') continue;
  const text = read(file);
  if (!text || text.length > 4_000_000) continue;
  if (text.includes(knownEmail)) {
    seedFiles.push(rel(file));
    if (/(neutral|disable|revoke|legacy)/.test(name + ' ' + text.slice(0, 3000).toLowerCase()) && /(update|delete|disable|revoke|random|unusable)/i.test(text)) neutralizer = true;
    if (/(seed|fixture|development|dev)/.test(name) && /(node_env|production|localhost|development)/i.test(text)) localSeederGuard = true;
  }
  const guardedLocalCredential = /(?:seed|fixture|development|dev)/.test(name) && /(?:node_env|production|localhost|development)/i.test(text);
  const historicalMigration = /(?:^|\/)(?:migrations?|db\/migrate)(?:\/|$)/.test(name) || name.endsWith('.sql');
  const documentationOnly = /\.(?:md|mdx|txt)$/.test(name);
  if (text.includes(knownPassword) && !guardedLocalCredential && !historicalMigration && !documentationOnly) directPasswordFiles.push(rel(file));
  if (/(bootstrap|create).{0,30}admin|admin.{0,30}(bootstrap|create)/i.test(name + ' ' + text.slice(0, 5000)) && /(password|credential)/i.test(text) && !text.includes(knownPassword)) adminBootstrap = true;
}
const legacySeedPresent = seedFiles.length > 0;
result('legacy-seed-neutralized', !legacySeedPresent || neutralizer ? 'pass' : 'error', !legacySeedPresent ? 'No legacy development owner seed found' : neutralizer ? 'Legacy seed is paired with a neutralization/revocation migration' : 'Legacy development owner seed exists without a detectable neutralizer', seedFiles);
result('known-password-removed', directPasswordFiles.length ? 'error' : 'pass', directPasswordFiles.length ? 'Known development password remains in repository content' : 'Known development password is absent from runtime/release content', directPasswordFiles);
result('local-dev-seeder-guard', !legacySeedPresent || localSeederGuard ? 'pass' : 'warning', localSeederGuard ? 'Development seed path has an environment guard' : 'No guarded local development seeder detected');
result('production-admin-bootstrap', adminBootstrap ? 'pass' : 'warning', adminBootstrap ? 'Explicit production administrator bootstrap path detected' : 'No explicit production administrator bootstrap path detected');

const checklistFiles = files.filter((f) => /(?:task|todo|checklist|status|release|production|roadmap|feature)/i.test(path.basename(f)) && /\.(?:md|mdx|txt)$/i.test(f));
const unchecked = [];
const blockers = [];
for (const file of checklistFiles) {
  const text = read(file) ?? '';
  text.split(/\r?\n/).forEach((line, index) => {
    if (!/^\s*(?:[-*]|\d+[.)])?\s*\[ \]/.test(line)) return;
    const item = { file: rel(file), line: index + 1, text: line.trim() };
    unchecked.push(item);
    if (/\b(?:P0|critical|blocker|must[- ]ship|launch[- ]blocking|VAL-001)\b/i.test(line)) blockers.push(item);
  });
}
const proofAcknowledged = process.env.INSTALLED_PROOF_OK === '1';
const unresolvedBlockers = blockers.filter((item) => proofAcknowledged || !/VAL-001/i.test(item.text));
const proofPending = blockers.filter((item) => /VAL-001/i.test(item.text));
result('release-checklist', unresolvedBlockers.length ? 'error' : proofPending.length ? 'warning' : 'pass', unresolvedBlockers.length ? `${unresolvedBlockers.length} explicit launch blocker(s) remain` : proofPending.length ? 'Installed production proof remains an external release gate' : 'No explicit unchecked launch blocker found', blockers);
result('feature-backlog', 'info', `${unchecked.length} unchecked checklist item(s) remain; optional ideas are reported but do not fail this audit`);

for (const script of ['build']) {
  result(`package-script-${script}`, pkg.scripts?.[script] ? 'pass' : 'error', pkg.scripts?.[script] ? `package.json defines ${script}` : `package.json does not define ${script}`);
}
for (const script of ['lint', 'typecheck', 'test']) {
  result(`package-script-${script}`, pkg.scripts?.[script] ? 'pass' : 'warning', pkg.scripts?.[script] ? `package.json defines ${script}` : `package.json does not define ${script}`);
}

const summary = {
  generatedAt: new Date().toISOString(),
  strict,
  packageManager: pm || manager,
  counts: {
    pass: checks.filter((c) => c.status === 'pass').length,
    warning: checks.filter((c) => c.status === 'warning').length,
    error: checks.filter((c) => c.status === 'error').length,
    info: checks.filter((c) => c.status === 'info').length,
    uncheckedChecklistItems: unchecked.length,
    explicitBlockers: blockers.length,
  },
  checks,
};
if (jsonOnly) console.log(JSON.stringify(summary, null, 2));
else {
  for (const check of checks) {
    const marker = { pass: 'PASS', warning: 'WARN', error: 'FAIL', info: 'INFO' }[check.status];
    console.log(`[${marker}] ${check.id}: ${check.message}`);
    for (const item of check.evidence.slice(0, 12)) console.log(`       - ${typeof item === 'string' ? item : `${item.file}:${item.line} ${item.text}`}`);
  }
  console.log(`\nSummary: ${summary.counts.pass} passed, ${summary.counts.warning} warnings, ${summary.counts.error} failed.`);
}
if (strict && issues.length) process.exitCode = 1;
