import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CatalogIssue,
  LineCandidate,
  PerfumeCandidate,
  validateCatalog,
} from '../src/app/catalog/catalog.schema';
import { LineProfile, Perfume } from '../src/app/catalog/perfume.model';

const root = process.cwd();
const content = join(root, 'content');
const target = join(root, 'src', 'app', 'catalog', 'perfumes.generated.ts');

function yamlFiles(directory: string): string[] {
  return existsSync(directory)
    ? readdirSync(directory)
        .filter((entry) => entry.endsWith('.yml'))
        .sort()
    : [];
}

function parse(path: string): unknown {
  try {
    return Bun.YAML.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function format(issues: readonly CatalogIssue[]): string {
  const order: string[] = [];
  const grouped = new Map<string, string[]>();

  for (const issue of issues) {
    const messages = grouped.get(issue.file);

    if (messages) {
      messages.push(issue.message);
    } else {
      grouped.set(issue.file, [issue.message]);
      order.push(issue.file);
    }
  }

  const lines = order.flatMap((file) => [
    file,
    ...(grouped.get(file) ?? []).map((message) => `  ${message}`),
  ]);

  return `${lines.join('\n')}\ncatalog: ${issues.length} errors\n`;
}

function emit(lines: readonly LineProfile[], perfumes: readonly Perfume[]): string {
  return [
    "import { LineProfile, Perfume } from './perfume.model';",
    '',
    `export const LINES: readonly LineProfile[] = ${JSON.stringify(lines, null, 2)};`,
    '',
    `export const PERFUMES: readonly Perfume[] = ${JSON.stringify(perfumes, null, 2)};`,
    '',
  ].join('\n');
}

const lineCandidates: LineCandidate[] = yamlFiles(join(content, 'lines')).map((file) => ({
  file: `content/lines/${file}`,
  line: file.replace(/\.yml$/, ''),
  value: parse(join(content, 'lines', file)),
}));

const perfumesRoot = join(content, 'perfumes');

const perfumeCandidates: PerfumeCandidate[] = readdirSync(perfumesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .flatMap((line) =>
    yamlFiles(join(perfumesRoot, line)).map((file) => ({
      file: `content/perfumes/${line}/${file}`,
      line,
      slug: file.replace(/\.yml$/, ''),
      value: parse(join(perfumesRoot, line, file)),
    })),
  );

const validation = validateCatalog(lineCandidates, perfumeCandidates, {
  photoExists: (photo) => existsSync(join(root, 'public', photo)),
});

if (validation.issues.length > 0) {
  process.stderr.write(format(validation.issues));
  process.exit(1);
}

writeFileSync(target, emit(validation.lines, validation.perfumes), 'utf8');
process.stdout.write(
  `catalog: ${validation.lines.length} lines, ${validation.perfumes.length} perfumes\n`,
);
