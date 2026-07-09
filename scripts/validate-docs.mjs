#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const apiRoot = path.join(repoRoot, 'apps/web/src/app/api');
const docsRoot = path.join(repoRoot, 'docs');

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walkFiles(dir, predicate, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, results);
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function routePathFromFile(filePath) {
  const relative = path.relative(apiRoot, path.dirname(filePath));
  const segments = relative
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => segment.replace(/^\[(.+)\]$/, ':$1'));

  return `/api/${segments.join('/')}`.replace(/\/+/g, '/');
}

function exportedMethods(source) {
  return httpMethods.filter((method) => {
    const pattern = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\b`,
    );
    return pattern.test(source);
  });
}

const notes = [];
const errors = [];

const apiRouteFiles = walkFiles(
  apiRoot,
  (filePath) => path.basename(filePath) === 'route.ts',
).sort();
const apiReferencePath = path.join(docsRoot, 'api-reference.md');
const apiReference = read(apiReferencePath);

const actualRoutes = apiRouteFiles.map((filePath) => ({
  file: path.relative(repoRoot, filePath),
  route: routePathFromFile(filePath),
  methods: exportedMethods(read(filePath)),
}));

for (const route of actualRoutes) {
  if (route.methods.length === 0) {
    errors.push(`${route.file} does not export a recognized HTTP method.`);
  }

  if (!apiReference.includes(`\`${route.route}\``)) {
    errors.push(`${route.route} is missing from docs/api-reference.md.`);
  }
}

const documentedRoutes = [...apiReference.matchAll(/`(\/api\/[A-Za-z0-9_:\/-]+)`/g)].map(
  (match) => match[1],
);
const actualRouteSet = new Set(actualRoutes.map((entry) => entry.route));
const ignoredDocumentedRoutes = new Set(['/api/auth/*', '/api/characters/*', '/api/admin/*']);
for (const documentedRoute of documentedRoutes) {
  if (!actualRouteSet.has(documentedRoute) && !ignoredDocumentedRoutes.has(documentedRoute)) {
    errors.push(
      `${documentedRoute} is documented in docs/api-reference.md but no matching route file exists.`,
    );
  }
}

const duplicateDocumentedRoutes = documentedRoutes.filter(
  (route, index) => documentedRoutes.indexOf(route) !== index,
);
for (const route of new Set(duplicateDocumentedRoutes)) {
  notes.push(`${route} appears more than once in docs/api-reference.md.`);
}

const featureHistoryPath = path.join(docsRoot, 'feature-history.md');
if (!fs.existsSync(featureHistoryPath)) {
  errors.push('docs/feature-history.md is missing.');
}
const featureHistory = fs.existsSync(featureHistoryPath) ? read(featureHistoryPath) : '';
const historicalPasses = [...featureHistory.matchAll(/^## Pass (\d+):/gm)].map((match) => match[1]);
if (historicalPasses.length < 60) {
  errors.push(
    `docs/feature-history.md only contains ${historicalPasses.length} pass sections; expected the consolidated historical pass trail.`,
  );
}
for (const requiredPass of ['60', '70', '71', '72', '73']) {
  if (!historicalPasses.includes(requiredPass)) {
    errors.push(`docs/feature-history.md is missing Pass ${requiredPass}.`);
  }
}

const passFiles = walkFiles(docsRoot, (filePath) => /feature-pass-\d+\.md$/.test(filePath))
  .map((filePath) => path.basename(filePath))
  .sort();
if (passFiles.length > 0) {
  errors.push(
    `Historical feature pass files should be consolidated into docs/feature-history.md: ${passFiles.join(', ')}.`,
  );
}

const migrationGuide = read(path.join(docsRoot, 'migration-guide.md'));
const migrationFiles = walkFiles(path.join(repoRoot, 'packages/db/drizzle'), (filePath) =>
  /\d{4}_.+\.sql$/.test(filePath),
)
  .map((filePath) => path.basename(filePath))
  .sort();
const latestMigration = migrationFiles.at(-1);
if (latestMigration && !migrationGuide.includes(latestMigration)) {
  errors.push(`docs/migration-guide.md does not mention latest migration ${latestMigration}.`);
}

const packageJson = JSON.parse(read(path.join(repoRoot, 'package.json')));
if (!packageJson.scripts?.['validate:docs']) {
  errors.push('package.json is missing a validate:docs script.');
}

const result = {
  summary: {
    validatedAt: new Date().toISOString(),
    apiRoutes: actualRoutes.length,
    documentedApiRoutes: new Set(documentedRoutes).size,
    featureHistorySections: historicalPasses.length,
    latestMigration,
    notes: notes.length,
    errors: errors.length,
    ok: errors.length === 0,
  },
  notes,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
