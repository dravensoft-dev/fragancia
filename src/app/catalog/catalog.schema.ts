import { LineProfile, Perfume, PerfumeLine } from './perfume.model';
import { META_DESCRIPTION_MAX, metaDescriptionOf } from './perfume-meta';

export const LINE_NAMES: readonly PerfumeLine[] = ['hombre', 'mujer'];
export const CONCENTRATIONS: readonly string[] = ['Eau de parfum', 'Eau de toilette'];
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PHOTO_PATTERN = /^\/img\/perfumes\/[a-z0-9-]+\.(webp|jpg|png)$/;

export const PERFUME_KEYS: readonly string[] = [
  'slug',
  'name',
  'brand',
  'line',
  'family',
  'notes',
  'sizeMl',
  'priceBob',
  'concentration',
  'summary',
  'description',
  'featured',
  'inStock',
  'order',
  'photo',
];

export interface CatalogIssue {
  readonly file: string;
  readonly message: string;
}

export interface PerfumeCandidate {
  readonly file: string;
  readonly line: string;
  readonly slug: string;
  readonly value: unknown;
}

export interface CatalogRules {
  readonly photoExists: (photo: string) => boolean;
}

export interface PerfumeResult {
  readonly issues: readonly CatalogIssue[];
  readonly perfume?: Perfume;
}

export function validatePerfume(candidate: PerfumeCandidate, rules: CatalogRules): PerfumeResult {
  const value = asRecord(candidate.value);

  if (!value) {
    return { issues: [{ file: candidate.file, message: 'file: expected a mapping of fields' }] };
  }

  const messages: string[] = [];

  for (const key of Object.keys(value)) {
    if (!PERFUME_KEYS.includes(key)) {
      messages.push(`${key}: unknown field`);
    }
  }

  const slug = asText(value['slug']);

  if (slug === undefined || !SLUG_PATTERN.test(slug)) {
    messages.push(
      `slug: expected lowercase words joined by hyphens, received ${shown(value['slug'])}`,
    );
  } else if (slug !== candidate.slug) {
    messages.push(`slug: ${shown(slug)} does not match the file name ${shown(candidate.slug)}`);
  }

  const name = asText(value['name']);

  if (name === undefined || name.length > 60) {
    messages.push(`name: expected 1 to 60 characters, received ${sized(value['name'])}`);
  }

  const brand = asText(value['brand']);

  if (brand === undefined) {
    messages.push(`brand: expected a non-empty string, received ${shown(value['brand'])}`);
  }

  const line = asLine(value['line']);

  if (line === undefined) {
    messages.push(
      `line: expected one of ${LINE_NAMES.join(', ')}, received ${shown(value['line'])}`,
    );
  } else if (line !== candidate.line) {
    messages.push(`line: ${shown(line)} does not match the directory ${shown(candidate.line)}`);
  }

  const family = asText(value['family']);

  if (family === undefined) {
    messages.push(`family: expected a non-empty string, received ${shown(value['family'])}`);
  }

  const notes = asNotes(value['notes']);

  if (notes === undefined) {
    messages.push(
      `notes: expected between 1 and 8 non-empty strings, received ${shown(value['notes'])}`,
    );
  }

  const sizeMl = asInteger(value['sizeMl'], 1, 1000);

  if (sizeMl === undefined) {
    messages.push(
      `sizeMl: expected an integer between 1 and 1000, received ${shown(value['sizeMl'])}`,
    );
  }

  const priceBob = asInteger(value['priceBob'], 1, 100000);

  if (priceBob === undefined) {
    messages.push(
      `priceBob: expected an integer between 1 and 100000, received ${shown(value['priceBob'])}`,
    );
  }

  const concentration = asText(value['concentration']);

  if (concentration === undefined || !CONCENTRATIONS.includes(concentration)) {
    messages.push(
      `concentration: expected one of ${CONCENTRATIONS.join(', ')}, received ${shown(value['concentration'])}`,
    );
  }

  const summary = asText(value['summary']);

  if (summary === undefined || summary.length < 30 || summary.length > 110) {
    messages.push(`summary: expected 30 to 110 characters, received ${sized(value['summary'])}`);
  }

  const description = asText(value['description']);

  if (description === undefined || description.length < 80) {
    messages.push(
      `description: expected at least 80 characters, received ${sized(value['description'])}`,
    );
  }

  const featured = asBoolean(value['featured']);

  if (featured === undefined) {
    messages.push(`featured: expected true or false, received ${shown(value['featured'])}`);
  }

  const inStock = asBoolean(value['inStock']);

  if (inStock === undefined) {
    messages.push(`inStock: expected true or false, received ${shown(value['inStock'])}`);
  }

  const order = asInteger(value['order'], 0, 999);

  if (order === undefined) {
    messages.push(
      `order: expected an integer between 0 and 999, received ${shown(value['order'])}`,
    );
  }

  let photo: string | undefined;

  if (value['photo'] !== undefined) {
    const path = asText(value['photo']);

    if (path === undefined || !PHOTO_PATTERN.test(path)) {
      messages.push(
        `photo: expected a path such as /img/perfumes/name.webp, received ${shown(value['photo'])}`,
      );
    } else if (!rules.photoExists(path)) {
      messages.push(`photo: ${path} does not exist`);
    } else {
      photo = path;
    }
  }

  if (
    summary !== undefined &&
    concentration !== undefined &&
    sizeMl !== undefined &&
    priceBob !== undefined
  ) {
    const composed = metaDescriptionOf({ summary, concentration, sizeMl, priceBob });

    if (composed.length > META_DESCRIPTION_MAX) {
      messages.push(
        `summary: the composed meta description is ${composed.length} characters, over the ${META_DESCRIPTION_MAX} allowed`,
      );
    }
  }

  if (messages.length > 0) {
    return { issues: messages.map((message) => ({ file: candidate.file, message })) };
  }

  if (
    slug === undefined ||
    name === undefined ||
    brand === undefined ||
    line === undefined ||
    family === undefined ||
    notes === undefined ||
    sizeMl === undefined ||
    priceBob === undefined ||
    concentration === undefined ||
    summary === undefined ||
    description === undefined ||
    featured === undefined ||
    inStock === undefined ||
    order === undefined
  ) {
    return { issues: [{ file: candidate.file, message: 'file: incomplete record' }] };
  }

  const perfume: Perfume = {
    slug,
    name,
    brand,
    line,
    family,
    notes,
    sizeMl,
    priceBob,
    concentration,
    summary,
    description,
    featured,
    inStock,
    order,
    ...(photo === undefined ? {} : { photo }),
  };

  return { issues: [], perfume };
}

export const LINE_KEYS: readonly string[] = [
  'line',
  'path',
  'label',
  'descriptor',
  'sloganLead',
  'slogan',
  'lede',
  'metaDescription',
  'rosegold',
];

export interface LineCandidate {
  readonly file: string;
  readonly line: string;
  readonly value: unknown;
}

export interface LineResult {
  readonly issues: readonly CatalogIssue[];
  readonly profile?: LineProfile;
}

export function validateLine(candidate: LineCandidate): LineResult {
  const value = asRecord(candidate.value);

  if (!value) {
    return { issues: [{ file: candidate.file, message: 'file: expected a mapping of fields' }] };
  }

  const messages: string[] = [];

  for (const key of Object.keys(value)) {
    if (!LINE_KEYS.includes(key)) {
      messages.push(`${key}: unknown field`);
    }
  }

  const line = asLine(value['line']);

  if (line === undefined) {
    messages.push(
      `line: expected one of ${LINE_NAMES.join(', ')}, received ${shown(value['line'])}`,
    );
  } else if (line !== candidate.line) {
    messages.push(`line: ${shown(line)} does not match the file name ${shown(candidate.line)}`);
  }

  const path = asText(value['path']);
  const expected = `/perfumes/${candidate.line}`;

  if (path !== expected) {
    messages.push(`path: expected ${shown(expected)}, received ${shown(value['path'])}`);
  }

  const copy: Record<string, string | undefined> = {};

  for (const key of ['label', 'descriptor', 'sloganLead', 'slogan', 'lede']) {
    copy[key] = asText(value[key]);

    if (copy[key] === undefined) {
      messages.push(`${key}: expected a non-empty string, received ${shown(value[key])}`);
    }
  }

  const metaDescription = asText(value['metaDescription']);

  if (
    metaDescription === undefined ||
    metaDescription.length < 50 ||
    metaDescription.length > META_DESCRIPTION_MAX
  ) {
    messages.push(
      `metaDescription: expected 50 to ${META_DESCRIPTION_MAX} characters, received ${sized(value['metaDescription'])}`,
    );
  }

  const rosegold = asBoolean(value['rosegold']);

  if (rosegold === undefined) {
    messages.push(`rosegold: expected true or false, received ${shown(value['rosegold'])}`);
  }

  if (messages.length > 0) {
    return { issues: messages.map((message) => ({ file: candidate.file, message })) };
  }

  const { label, descriptor, sloganLead, slogan, lede } = copy;

  if (
    line === undefined ||
    path === undefined ||
    label === undefined ||
    descriptor === undefined ||
    sloganLead === undefined ||
    slogan === undefined ||
    lede === undefined ||
    metaDescription === undefined ||
    rosegold === undefined
  ) {
    return { issues: [{ file: candidate.file, message: 'file: incomplete record' }] };
  }

  return {
    issues: [],
    profile: {
      line,
      path,
      label,
      descriptor,
      sloganLead,
      slogan,
      lede,
      metaDescription,
      rosegold,
    },
  };
}

export interface CatalogValidation {
  readonly issues: readonly CatalogIssue[];
  readonly lines: readonly LineProfile[];
  readonly perfumes: readonly Perfume[];
}

export function validateCatalog(
  lineCandidates: readonly LineCandidate[],
  perfumeCandidates: readonly PerfumeCandidate[],
  rules: CatalogRules,
): CatalogValidation {
  const issues: CatalogIssue[] = [];
  const profiles: LineProfile[] = [];
  const perfumes: Perfume[] = [];
  const seen = new Map<string, string>();

  for (const candidate of lineCandidates) {
    const result = validateLine(candidate);

    issues.push(...result.issues);

    if (result.profile) {
      profiles.push(result.profile);
    }
  }

  for (const candidate of perfumeCandidates) {
    const result = validatePerfume(candidate, rules);

    issues.push(...result.issues);

    const perfume = result.perfume;

    if (perfume === undefined) {
      continue;
    }

    const key = `${perfume.line}/${perfume.slug}`;
    const first = seen.get(key);

    if (first !== undefined) {
      issues.push({
        file: candidate.file,
        message: `slug: ${shown(perfume.slug)} is already used in ${first}`,
      });
      continue;
    }

    seen.set(key, candidate.file);

    if (!profiles.some((profile) => profile.line === perfume.line)) {
      issues.push({
        file: candidate.file,
        message: `line: ${shown(perfume.line)} has no profile in content/lines`,
      });
    }

    perfumes.push(perfume);
  }

  for (const profile of profiles) {
    const inLine = perfumes.filter((perfume) => perfume.line === profile.line);

    if (inLine.length === 0) {
      issues.push({
        file: `content/lines/${profile.line}.yml`,
        message: 'line: no perfume belongs to this line',
      });
      continue;
    }

    if (!inLine.some((perfume) => perfume.featured)) {
      issues.push({
        file: 'catalog',
        message: `featured: line ${shown(profile.line)} has no featured perfume`,
      });
    }
  }

  const featured = perfumes.filter((perfume) => perfume.featured).length;

  if (featured < 2 || featured > 8) {
    issues.push({
      file: 'catalog',
      message: `featured: expected between 2 and 8 featured perfumes, found ${featured}`,
    });
  }

  if (issues.length > 0) {
    return { issues, lines: [], perfumes: [] };
  }

  return { issues, lines: sortLines(profiles), perfumes: sortPerfumes(perfumes) };
}

export function sortLines(profiles: readonly LineProfile[]): readonly LineProfile[] {
  return [...profiles].sort((a, b) => LINE_NAMES.indexOf(a.line) - LINE_NAMES.indexOf(b.line));
}

export function sortPerfumes(perfumes: readonly Perfume[]): readonly Perfume[] {
  return [...perfumes].sort(
    (a, b) =>
      LINE_NAMES.indexOf(a.line) - LINE_NAMES.indexOf(b.line) ||
      a.order - b.order ||
      a.name.localeCompare(b.name, 'es'),
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asInteger(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asLine(value: unknown): PerfumeLine | undefined {
  return LINE_NAMES.find((name) => name === value);
}

function asNotes(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    return undefined;
  }

  const notes: string[] = [];

  for (const item of value) {
    const note = asText(item);

    if (note === undefined) {
      return undefined;
    }

    notes.push(note);
  }

  return notes;
}

function shown(value: unknown): string {
  return value === undefined ? 'nothing' : JSON.stringify(value);
}

function sized(value: unknown): string {
  return typeof value === 'string' ? `${value.length} characters` : shown(value);
}
