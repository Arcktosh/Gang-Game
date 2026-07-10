import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, posix, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const MEMORY_DIR = join(ROOT, '.agent-memory');
const CHECK_MODE = process.argv.includes('--check');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const INDEXED_EXTENSIONS = new Set([
  '.css',
  '.json',
  '.md',
  '.mjs',
  '.sh',
  '.sql',
  '.svg',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);
const INDEXED_FILENAMES = new Set([
  '.env.example',
  '.gitignore',
  '.prettierrc',
  'LICENSE',
  'docker-compose.yml',
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
]);
const EXCLUDED_DIRECTORIES = new Set([
  '.agent-memory',
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
  'tmp',
]);
const TASK_STATUSES = new Set(['backlog', 'ready', 'in_progress', 'blocked', 'done', 'cancelled']);
const TASK_PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);

function toPosix(value) {
  return value.split('\\').join('/');
}

function relativePath(value) {
  return toPosix(relative(ROOT, value));
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function walk(directory, result = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, result);
      continue;
    }

    const extension = extname(entry.name);
    if (INDEXED_EXTENSIONS.has(extension) || INDEXED_FILENAMES.has(entry.name)) {
      result.push(absolutePath);
    }
  }

  return result;
}

function getScope(filePath) {
  const parts = relativePath(filePath).split('/');
  if (parts[0] === 'apps' || parts[0] === 'packages') return parts.slice(0, 2).join('/');
  if (parts[0] === 'docs' || parts[0] === 'scripts' || parts[0] === '.github') return parts[0];
  return 'root';
}

function getRole(filePath) {
  const path = relativePath(filePath);
  const name = posix.basename(path);

  if (/\/src\/app\/api\/.+\/route\.ts$/.test(path)) return 'API route';
  if (/\/src\/app\/.+\/page\.tsx$/.test(path) || /\/src\/app\/page\.tsx$/.test(path)) return 'App page';
  if (name === 'layout.tsx') return 'App layout';
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(name)) return 'Test';
  if (/\/drizzle\/\d+_.+\.sql$/.test(path)) return 'Database migration';
  if (path.includes('/src/schema/')) return 'Database schema';
  if (path.includes('/src/queries/')) return 'Database query module';
  if (path.includes('/src/ticks/')) return 'Worker tick';
  if (path.includes('/src/features/')) return 'Feature module';
  if (path.includes('/public/')) return 'Static asset';
  if (path.startsWith('scripts/')) return 'Automation script';
  if (path.startsWith('docs/')) return 'Documentation';
  if (name === 'package.json') return 'Package manifest';
  if (name.includes('config') || name.startsWith('tsconfig')) return 'Configuration';
  if (SOURCE_EXTENSIONS.has(extname(name))) return 'Source module';
  return 'Project file';
}

function lineCount(content) {
  if (content.length === 0) return 0;
  return content.split(/\r?\n/).length;
}

function extractImports(content) {
  const specifiers = new Set();
  const staticPattern = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicPattern = /\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const pattern of [staticPattern, dynamicPattern]) {
    let match;
    while ((match = pattern.exec(content)) !== null) specifiers.add(match[1]);
  }

  return [...specifiers].sort();
}

function lineAt(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function extractSymbols(content) {
  const symbols = [];
  const declarationPattern = /^(export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
  const namedExportPattern = /^export\s*\{([\s\S]*?)\}\s*(?:from\s*['"]([^'"]+)['"])?\s*;?/gm;
  const starExportPattern = /^export\s+\*\s+from\s+['"]([^'"]+)['"]\s*;?/gm;
  let match;

  while ((match = declarationPattern.exec(content)) !== null) {
    symbols.push({
      name: match[3],
      kind: match[2],
      exported: Boolean(match[1]),
      line: lineAt(content, match.index),
      source: null,
    });
  }

  while ((match = namedExportPattern.exec(content)) !== null) {
    const source = match[2] ?? null;
    for (const rawPart of match[1].split(',')) {
      const part = rawPart.trim().replace(/^type\s+/, '');
      if (!part) continue;
      const aliasParts = part.split(/\s+as\s+/);
      const exportedName = (aliasParts[1] ?? aliasParts[0]).trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(exportedName)) continue;
      symbols.push({
        name: exportedName,
        kind: source ? 're-export' : 'export',
        exported: true,
        line: lineAt(content, match.index),
        source,
      });
    }
  }

  while ((match = starExportPattern.exec(content)) !== null) {
    symbols.push({
      name: '*',
      kind: 'star-export',
      exported: true,
      line: lineAt(content, match.index),
      source: match[1],
    });
  }

  return symbols.sort((left, right) => left.line - right.line || left.name.localeCompare(right.name));
}

function loadJson(filePath) {
  return JSON.parse(readText(filePath));
}

function resolveModule(sourceFile, specifier, workspacePackages) {
  let basePath = null;

  if (specifier.startsWith('.')) {
    basePath = resolve(dirname(sourceFile), specifier);
  } else if (specifier.startsWith('@/')) {
    basePath = join(ROOT, 'apps/web/src', specifier.slice(2));
  } else {
    const packageName = Object.keys(workspacePackages)
      .sort((left, right) => right.length - left.length)
      .find((candidate) => specifier === candidate || specifier.startsWith(`${candidate}/`));

    if (packageName) {
      const packageRoot = workspacePackages[packageName].root;
      const subpath = specifier === packageName ? 'src/index' : specifier.slice(packageName.length + 1);
      basePath = join(packageRoot, subpath);
    }
  }

  if (!basePath) return null;

  const candidates = [
    basePath,
    ...[...SOURCE_EXTENSIONS].map((extension) => `${basePath}${extension}`),
    ...[...SOURCE_EXTENSIONS].map((extension) => join(basePath, `index${extension}`)),
  ];

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function routePath(filePath, suffix) {
  const appRoot = join(ROOT, 'apps/web/src/app');
  let route = toPosix(relative(appRoot, filePath)).replace(new RegExp(`/${suffix.replace('.', '\\.').replace('/', '\\/')}$`), '');
  route = route
    .split('/')
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .join('/');
  return route ? `/${route}` : '/';
}

function extractRouteMethods(content) {
  const methods = new Set();
  const pattern = /^export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/gm;
  let match;
  while ((match = pattern.exec(content)) !== null) methods.add(match[1]);
  return [...methods].sort();
}

function markdownTable(headers, rows) {
  const escape = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
  return [
    `| ${headers.map(escape).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function formatList(values) {
  return values.length > 0 ? values.map((value) => `\`${value}\``).join(', ') : '—';
}

function getWorkspacePackages() {
  const packagePaths = walk(ROOT).filter((filePath) => posix.basename(relativePath(filePath)) === 'package.json');
  const packages = {};

  for (const packagePath of packagePaths) {
    const manifest = loadJson(packagePath);
    if (!manifest.name || relativePath(packagePath) === 'package.json') continue;
    packages[manifest.name] = {
      root: dirname(packagePath),
      manifest,
      path: relativePath(packagePath),
    };
  }

  return packages;
}

function computeFingerprint(files) {
  const hash = createHash('sha256');
  for (const filePath of files) {
    hash.update(relativePath(filePath));
    hash.update('\0');
    hash.update(readFileSync(filePath));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

function collectPublicApi(entryFile, sourceRecords, workspacePackages, visited = new Set()) {
  if (!entryFile || visited.has(entryFile)) return [];
  visited.add(entryFile);

  const record = sourceRecords.get(entryFile);
  if (!record) return [];
  const exports = [];

  for (const symbol of record.symbols) {
    if (!symbol.exported) continue;
    if (symbol.kind === 'star-export' && symbol.source) {
      const target = resolveModule(entryFile, symbol.source, workspacePackages);
      exports.push(...collectPublicApi(target, sourceRecords, workspacePackages, visited));
      continue;
    }

    exports.push({
      name: symbol.name,
      kind: symbol.kind,
      source: symbol.source
        ? relativePath(resolveModule(entryFile, symbol.source, workspacePackages) ?? entryFile)
        : relativePath(entryFile),
    });
  }

  const deduplicated = new Map();
  for (const item of exports) {
    if (item.name === '*') continue;
    if (!deduplicated.has(item.name)) deduplicated.set(item.name, item);
  }
  return [...deduplicated.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function validateTasks() {
  const schemaPath = join(MEMORY_DIR, 'tasks.schema.json');
  const taskPath = join(MEMORY_DIR, 'tasks.json');
  if (!existsSync(schemaPath)) throw new Error('.agent-memory/tasks.schema.json is missing.');
  if (!existsSync(taskPath)) throw new Error('.agent-memory/tasks.json is missing.');
  const taskDocument = loadJson(taskPath);
  if (taskDocument.version !== 1 || !Array.isArray(taskDocument.tasks)) {
    throw new Error('.agent-memory/tasks.json must contain version 1 and a tasks array.');
  }

  const ids = new Set(taskDocument.tasks.map((task) => task.id));
  if (ids.size !== taskDocument.tasks.length) throw new Error('Task ids must be unique.');

  const statusById = new Map(taskDocument.tasks.map((task) => [task.id, task.status]));
  for (const task of taskDocument.tasks) {
    if (!task.id || !task.title || !task.type) throw new Error('Every task requires id, title, and type.');
    if (!TASK_STATUSES.has(task.status)) throw new Error(`Invalid task status for ${task.id}: ${task.status}`);
    if (!TASK_PRIORITIES.has(task.priority)) throw new Error(`Invalid task priority for ${task.id}: ${task.priority}`);
    if (!Array.isArray(task.scope) || !Array.isArray(task.acceptanceCriteria)) {
      throw new Error(`Task ${task.id} requires scope and acceptanceCriteria arrays.`);
    }
    for (const dependency of task.dependsOn ?? []) {
      if (!ids.has(dependency)) throw new Error(`Task ${task.id} depends on unknown task: ${dependency}`);
      if (dependency === task.id) throw new Error(`Task ${task.id} cannot depend on itself.`);
    }
    if (['ready', 'in_progress'].includes(task.status)) {
      const incompleteDependencies = (task.dependsOn ?? []).filter((dependency) => statusById.get(dependency) !== 'done');
      if (incompleteDependencies.length > 0) {
        throw new Error(`Task ${task.id} is ${task.status} but has incomplete dependencies: ${incompleteDependencies.join(', ')}`);
      }
    }
    for (const reference of task.sourceRefs ?? []) {
      if (!existsSync(join(ROOT, reference))) throw new Error(`Task ${task.id} references missing path: ${reference}`);
    }
  }
}

function createIndexes() {
  const allFiles = walk(ROOT).sort((left, right) => relativePath(left).localeCompare(relativePath(right)));
  const workspacePackages = getWorkspacePackages();
  const sourceRecords = new Map();
  const fileRecords = [];

  for (const filePath of allFiles) {
    const content = readText(filePath);
    const record = {
      absolutePath: filePath,
      path: relativePath(filePath),
      scope: getScope(filePath),
      role: getRole(filePath),
      extension: extname(filePath) || posix.basename(relativePath(filePath)),
      lines: lineCount(content),
      imports: SOURCE_EXTENSIONS.has(extname(filePath)) ? extractImports(content) : [],
      symbols: SOURCE_EXTENSIONS.has(extname(filePath)) ? extractSymbols(content) : [],
      content,
    };
    fileRecords.push(record);
    if (SOURCE_EXTENSIONS.has(extname(filePath))) sourceRecords.set(filePath, record);
  }

  const fingerprint = computeFingerprint(allFiles);
  const banner = `> Generated by \`pnpm agent:memory\`. Do not edit manually. Source fingerprint: \`${fingerprint}\`.`;
  const scopeNames = [...new Set(fileRecords.map((record) => record.scope))].sort();

  const summaryRows = scopeNames.map((scope) => {
    const records = fileRecords.filter((record) => record.scope === scope);
    return [
      scope,
      records.length,
      records.filter((record) => SOURCE_EXTENSIONS.has(extname(record.path))).length,
      records.filter((record) => record.role === 'Test').length,
      records.filter((record) => record.role === 'API route').length,
      records.reduce((sum, record) => sum + record.lines, 0),
    ];
  });

  const filesSections = scopeNames.map((scope) => {
    const rows = fileRecords
      .filter((record) => record.scope === scope)
      .map((record) => [
        `\`${record.path}\``,
        record.role,
        record.lines,
        record.symbols.filter((symbol) => symbol.exported && symbol.name !== '*').length,
      ]);
    return `## ${scope}\n\n${markdownTable(['Path', 'Role', 'Lines', 'Exports'], rows)}`;
  });

  const filesMarkdown = `# File Index\n\n${banner}\n\n## Scope summary\n\n${markdownTable(
    ['Scope', 'Files', 'Source files', 'Tests', 'API routes', 'Lines'],
    summaryRows,
  )}\n\n## Largest source modules\n\n${markdownTable(
    ['Path', 'Lines', 'Role'],
    fileRecords
      .filter((record) => SOURCE_EXTENSIONS.has(extname(record.path)))
      .sort((left, right) => right.lines - left.lines)
      .slice(0, 30)
      .map((record) => [`\`${record.path}\``, record.lines, record.role]),
  )}\n\n${filesSections.join('\n\n')}\n`;

  const incoming = new Map();
  const outgoing = new Map();
  const unresolved = [];
  const externalByScope = new Map();
  const importRows = [];

  for (const record of fileRecords.filter((candidate) => candidate.imports.length > 0)) {
    const internalTargets = [];
    const externalTargets = [];

    for (const specifier of record.imports) {
      const resolvedTarget = resolveModule(record.absolutePath, specifier, workspacePackages);
      if (resolvedTarget) {
        const targetPath = relativePath(resolvedTarget);
        internalTargets.push(targetPath);
        incoming.set(targetPath, (incoming.get(targetPath) ?? 0) + 1);
      } else if (specifier.startsWith('.') || specifier.startsWith('@/') || specifier.startsWith('@drugdeal/')) {
        unresolved.push([record.path, specifier]);
      } else {
        externalTargets.push(specifier);
        const scopeSet = externalByScope.get(record.scope) ?? new Set();
        scopeSet.add(specifier);
        externalByScope.set(record.scope, scopeSet);
      }
    }

    outgoing.set(record.path, internalTargets.length);
    importRows.push([
      `\`${record.path}\``,
      internalTargets.length,
      externalTargets.length,
      [...new Set([...internalTargets, ...externalTargets])].map((value) => `\`${value}\``).join('<br>'),
    ]);
  }

  const workspaceDependencyRows = Object.entries(workspacePackages)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, data]) => {
      const dependencies = data.manifest.dependencies ?? {};
      return [
        `\`${name}\``,
        relativePath(data.root),
        Object.keys(dependencies).filter((dependency) => dependency.startsWith('@drugdeal/')).join(', ') || '—',
        Object.keys(dependencies).filter((dependency) => !dependency.startsWith('@drugdeal/')).join(', ') || '—',
      ];
    });

  const fanOutRows = [...outgoing.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 30)
    .map(([path, count]) => [`\`${path}\``, count]);
  const fanInRows = [...incoming.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 30)
    .map(([path, count]) => [`\`${path}\``, count]);
  const externalRows = [...externalByScope.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scope, values]) => [scope, formatList([...values].sort())]);

  const importsMarkdown = `# Import Index\n\n${banner}\n\n## Workspace dependency graph\n\n${markdownTable(
    ['Package', 'Root', 'Workspace dependencies', 'External dependencies'],
    workspaceDependencyRows,
  )}\n\n## Highest internal fan-out\n\n${markdownTable(['Source', 'Internal imports'], fanOutRows)}\n\n## Highest internal fan-in\n\n${markdownTable(
    ['Target', 'Importers'],
    fanInRows,
  )}\n\n## External modules by scope\n\n${markdownTable(['Scope', 'Modules'], externalRows)}\n\n## Unresolved internal-looking imports\n\n${
    unresolved.length > 0
      ? markdownTable(['Source', 'Specifier'], unresolved.map(([source, specifier]) => [`\`${source}\``, `\`${specifier}\``]))
      : 'None.'
  }\n\n## Module import details\n\n${markdownTable(['Source', 'Internal', 'External', 'Targets'], importRows)}\n`;

  const rootManifest = loadJson(join(ROOT, 'package.json'));
  const manifestSections = [
    `## Root workspace\n\n${markdownTable(
      ['Field', 'Value'],
      [
        ['Name', rootManifest.name],
        ['Version', rootManifest.version],
        ['Package manager', rootManifest.packageManager],
        ['Node engine', rootManifest.engines?.node ?? '—'],
        ['pnpm engine', rootManifest.engines?.pnpm ?? '—'],
      ],
    )}\n\n### Root scripts\n\n${markdownTable(
      ['Script', 'Command'],
      Object.entries(rootManifest.scripts ?? {}).map(([name, command]) => [`\`${name}\``, `\`${command}\``]),
    )}`,
  ];

  for (const [name, data] of Object.entries(workspacePackages).sort(([left], [right]) => left.localeCompare(right))) {
    const manifest = data.manifest;
    manifestSections.push(`## ${name}\n\n${markdownTable(
      ['Field', 'Value'],
      [
        ['Manifest', `\`${data.path}\``],
        ['Entrypoint', manifest.main ? `\`${manifest.main}\`` : 'Application'],
        ['Type entrypoint', manifest.types ? `\`${manifest.types}\`` : '—'],
        ['Module type', manifest.type ?? 'CommonJS/default'],
      ],
    )}\n\n### Scripts\n\n${markdownTable(
      ['Script', 'Command'],
      Object.entries(manifest.scripts ?? {}).map(([script, command]) => [`\`${script}\``, `\`${command}\``]),
    )}\n\n### Dependencies\n\n${markdownTable(
      ['Kind', 'Packages'],
      [
        ['Runtime', formatList(Object.keys(manifest.dependencies ?? {}).sort())],
        ['Development', formatList(Object.keys(manifest.devDependencies ?? {}).sort())],
      ],
    )}`);
  }

  const tsconfigBase = loadJson(join(ROOT, 'tsconfig.base.json'));
  const aliases = Object.entries(tsconfigBase.compilerOptions?.paths ?? {}).map(([alias, targets]) => [
    `\`${alias}\``,
    formatList(targets),
  ]);
  const envKeys = readText(join(ROOT, '.env.example'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map((line) => line.slice(0, line.indexOf('=')));

  const manifestMarkdown = `# Manifest Index\n\n${banner}\n\n${manifestSections.join(
    '\n\n',
  )}\n\n## TypeScript aliases\n\n${markdownTable(['Alias', 'Targets'], aliases)}\n\n## Environment contract\n\nKeys declared in \`.env.example\`: ${formatList(
    envKeys,
  )}. Values are intentionally excluded from agent memory.\n\n## Infrastructure entrypoints\n\n- \`docker-compose.yml\` — PostgreSQL and Redis development services.\n- \`.github/workflows/ci.yml\` — continuous integration workflow.\n- \`scripts/prove-mvp-runtime.mjs\` — installed-environment proof orchestrator.\n- \`scripts/prove-integration.mjs\` — database-backed integration proof orchestrator.\n`;

  const publicApiSections = [];
  for (const [name, data] of Object.entries(workspacePackages).sort(([left], [right]) => left.localeCompare(right))) {
    const entry = data.manifest.main ? join(data.root, data.manifest.main) : null;
    if (!entry || !existsSync(entry)) continue;
    const api = collectPublicApi(entry, sourceRecords, workspacePackages);
    publicApiSections.push(`## ${name}\n\nEntrypoint: \`${relativePath(entry)}\`\n\n${markdownTable(
      ['Export', 'Kind', 'Declared/re-exported from'],
      api.map((item) => [`\`${item.name}\``, item.kind, `\`${item.source}\``]),
    )}`);
  }

  const apiRoutes = fileRecords
    .filter((record) => record.role === 'API route')
    .map((record) => [
      `\`${routePath(record.absolutePath, 'route.ts')}\``,
      extractRouteMethods(record.content).join(', ') || 'Unknown',
      `\`${record.path}\``,
    ])
    .sort((left, right) => left[0].localeCompare(right[0]));
  const pages = fileRecords
    .filter((record) => record.role === 'App page')
    .map((record) => [`\`${routePath(record.absolutePath, 'page.tsx')}\``, `\`${record.path}\``])
    .sort((left, right) => left[0].localeCompare(right[0]));

  const publicApiMarkdown = `# Public API Index\n\n${banner}\n\n${publicApiSections.join(
    '\n\n',
  )}\n\n## Web API routes\n\n${markdownTable(['Route', 'Methods', 'Source'], apiRoutes)}\n\n## Web pages\n\n${markdownTable(
    ['Route', 'Source'],
    pages,
  )}\n\n## Public API rules\n\n- Import shared workspace packages through their package name, not deep relative paths.\n- Add new shared exports to the package entrypoint and regenerate this memory.\n- Keep Next.js route handlers explicit with named HTTP method exports.\n- Treat files under \`apps/web/src/lib\` as app-internal unless promoted through a workspace package.\n`;

  const symbolSections = scopeNames.map((scope) => {
    const records = fileRecords.filter((record) => record.scope === scope && record.symbols.length > 0);
    const rows = records.flatMap((record) =>
      record.symbols
        .filter((symbol) => symbol.name !== '*')
        .map((symbol) => [
          `\`${symbol.name}\``,
          symbol.kind,
          symbol.exported ? 'yes' : 'no',
          `\`${record.path}:${symbol.line}\``,
        ]),
    );
    return rows.length > 0 ? `## ${scope}\n\n${markdownTable(['Symbol', 'Kind', 'Exported', 'Location'], rows)}` : '';
  });

  const symbolsMarkdown = `# Symbol Index\n\n${banner}\n\nThis index records top-level TypeScript/JavaScript declarations and explicit exports. It is intentionally syntax-oriented; use source files for behavioral detail.\n\n${symbolSections
    .filter(Boolean)
    .join('\n\n')}\n`;

  const readmeMarkdown = `# Agent Memory\n\n${banner}\n\nThis directory is a compact, deterministic retrieval layer for coding agents. Start with the smallest relevant index instead of scanning the entire repository.\n\n## Retrieval order\n\n1. Read \`../AGENTS.md\` for operating rules and repository boundaries.\n2. Read \`tasks.json\` and select one task whose dependencies are satisfied.\n3. Use \`manifest.md\` to identify the owning workspace and commands.\n4. Use \`public-api.md\` and \`symbols.md\` to find stable entrypoints.\n5. Use \`imports.md\` before changing shared modules or dependency direction.\n6. Use \`files.md\` only when broader discovery is required.\n\n## Files\n\n- \`files.md\` — path, role, size, scope, and export counts.\n- \`imports.md\` — workspace dependencies, fan-in/fan-out, and module-level imports.\n- \`manifest.md\` — package manifests, scripts, aliases, and environment key names.\n- \`public-api.md\` — workspace exports, Next.js API routes, and pages.\n- \`symbols.md\` — top-level declarations and export locations.\n- \`tasks.json\` — manually curated, machine-readable work queue.\n- \`tasks.schema.json\` — JSON Schema for the work queue.\n\n## Maintenance\n\nRun \`pnpm agent:memory\` after changing source structure, imports, exports, manifests, routes, or symbols. Run \`pnpm agent:memory:check\` to verify that generated memory and the task queue are valid.\n`;

  return {
    'README.md': readmeMarkdown,
    'files.md': filesMarkdown,
    'imports.md': importsMarkdown,
    'manifest.md': manifestMarkdown,
    'public-api.md': publicApiMarkdown,
    'symbols.md': symbolsMarkdown,
  };
}

function writeOrCheck(indexes) {
  const differences = [];
  for (const [fileName, content] of Object.entries(indexes)) {
    const target = join(MEMORY_DIR, fileName);
    if (CHECK_MODE) {
      if (!existsSync(target) || readText(target) !== content) differences.push(fileName);
    } else {
      writeFileSync(target, content);
    }
  }

  if (differences.length > 0) {
    throw new Error(`Agent memory is stale: ${differences.join(', ')}. Run pnpm agent:memory.`);
  }
}

try {
  const indexes = createIndexes();
  writeOrCheck(indexes);
  validateTasks();
  console.log(CHECK_MODE ? 'Agent memory is current.' : 'Agent memory generated.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
