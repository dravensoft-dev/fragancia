import { Perfume, PerfumeLine } from './perfume.model';
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
