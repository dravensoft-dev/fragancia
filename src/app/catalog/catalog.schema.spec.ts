import { CatalogRules, PerfumeCandidate, validatePerfume } from './catalog.schema';

const RULES: CatalogRules = { photoExists: (photo) => photo === '/img/perfumes/yara.webp' };

const VALID: Record<string, unknown> = {
  slug: 'yara',
  name: 'Yara',
  brand: 'Lattafa',
  line: 'mujer',
  family: 'Floral gourmand',
  notes: ['Orquídea', 'Heliotropo', 'Vainilla'],
  sizeMl: 100,
  priceBob: 290,
  concentration: 'Eau de parfum',
  summary: 'Orquídea y vainilla, dulce y reconocible.',
  description:
    'El femenino más vendido de la casa y el que más gente pregunta por su nombre en la calle.',
  featured: true,
  inStock: true,
  order: 10,
  photo: '/img/perfumes/yara.webp',
};

function candidate(
  overrides: Record<string, unknown> = {},
  patch: Partial<PerfumeCandidate> = {},
): PerfumeCandidate {
  return {
    file: 'content/perfumes/mujer/yara.yml',
    line: 'mujer',
    slug: 'yara',
    value: { ...VALID, ...overrides },
    ...patch,
  };
}

function reported(
  overrides: Record<string, unknown> = {},
  patch: Partial<PerfumeCandidate> = {},
): string {
  return validatePerfume(candidate(overrides, patch), RULES)
    .issues.map((issue) => issue.message)
    .join('\n');
}

function without(key: string): Record<string, unknown> {
  const value = { ...VALID };

  delete value[key];

  return value;
}

describe('validatePerfume', () => {
  it('returns the typed record and no issue for a valid file', () => {
    const result = validatePerfume(candidate(), RULES);

    expect(result.issues).toEqual([]);
    expect(result.perfume).toEqual({
      slug: 'yara',
      name: 'Yara',
      brand: 'Lattafa',
      line: 'mujer',
      family: 'Floral gourmand',
      notes: ['Orquídea', 'Heliotropo', 'Vainilla'],
      sizeMl: 100,
      priceBob: 290,
      concentration: 'Eau de parfum',
      summary: 'Orquídea y vainilla, dulce y reconocible.',
      description:
        'El femenino más vendido de la casa y el que más gente pregunta por su nombre en la calle.',
      featured: true,
      inStock: true,
      order: 10,
      photo: '/img/perfumes/yara.webp',
    });
  });

  it('names the file on every issue it reports', () => {
    const result = validatePerfume(candidate({ brand: '' }), RULES);

    expect(result.issues[0].file).toBe('content/perfumes/mujer/yara.yml');
    expect(result.perfume).toBeUndefined();
  });

  it('refuses anything that is not a mapping', () => {
    expect(reported({}, { value: 'yara' })).toContain('file: expected a mapping of fields');
  });

  it('shouts at a misspelled key instead of ignoring it', () => {
    expect(reported({ precioBob: 320 })).toContain('precioBob: unknown field');
  });

  it('takes a slug of lowercase words joined by hyphens', () => {
    expect(reported({ slug: 'club-de-nuit-woman' }, { slug: 'club-de-nuit-woman' })).toBe('');
    expect(reported({ slug: 'Yara' })).toContain(
      'slug: expected lowercase words joined by hyphens, received "Yara"',
    );
  });

  it('requires the slug to match the file name', () => {
    expect(reported({ slug: 'najdia' })).toContain(
      'slug: "najdia" does not match the file name "yara"',
    );
  });

  it('takes a name of 1 to 60 characters', () => {
    expect(reported({ name: 'x'.repeat(60) })).toBe('');
    expect(reported({ name: 'x'.repeat(61) })).toContain('name: expected 1 to 60 characters');
    expect(reported({}, { value: without('name') })).toContain('name: expected 1 to 60 characters');
  });

  it('requires a brand', () => {
    expect(reported({ brand: '   ' })).toContain('brand: expected a non-empty string');
  });

  it('takes a line from the closed set', () => {
    expect(reported({ line: 'unisex' })).toContain(
      'line: expected one of hombre, mujer, received "unisex"',
    );
  });

  it('requires the line to match the directory', () => {
    expect(reported({ line: 'hombre' })).toContain(
      'line: "hombre" does not match the directory "mujer"',
    );
  });

  it('requires a family', () => {
    expect(reported({ family: '' })).toContain('family: expected a non-empty string');
  });

  it('takes between 1 and 8 non-empty notes', () => {
    expect(reported({ notes: ['Rosa'] })).toBe('');
    expect(reported({ notes: [] })).toContain('notes: expected between 1 and 8 non-empty strings');
    expect(reported({ notes: Array(9).fill('Rosa') })).toContain('notes: expected between 1 and 8');
    expect(reported({ notes: ['Rosa', ''] })).toContain('notes: expected between 1 and 8');
    expect(reported({ notes: 'Rosa' })).toContain('notes: expected between 1 and 8');
  });

  it('takes a size in millilitres as an integer from 1 to 1000', () => {
    expect(reported({ sizeMl: 1000 })).toBe('');
    expect(reported({ sizeMl: 0 })).toContain('sizeMl: expected an integer between 1 and 1000');
    expect(reported({ sizeMl: 100.5 })).toContain('sizeMl: expected an integer between 1 and 1000');
  });

  it('takes a price as an integer from 1 to 100000 and never as text', () => {
    expect(reported({ priceBob: '320 Bs' })).toContain(
      'priceBob: expected an integer between 1 and 100000, received "320 Bs"',
    );
    expect(reported({ priceBob: -1 })).toContain('priceBob: expected an integer between 1 and');
  });

  it('takes a concentration from the two the house sells', () => {
    expect(reported({ concentration: 'Eau de toilette' })).toBe('');
    expect(reported({ concentration: 'Parfum' })).toContain(
      'concentration: expected one of Eau de parfum, Eau de toilette, received "Parfum"',
    );
  });

  it('takes a summary of 30 to 110 characters', () => {
    expect(reported({ summary: 'x'.repeat(30) })).toBe('');
    expect(reported({ summary: 'x'.repeat(29) })).toContain(
      'summary: expected 30 to 110 characters, received 29 characters',
    );
    expect(reported({ summary: 'x'.repeat(111) })).toContain('summary: expected 30 to 110');
  });

  it('measures the composed meta description, not the summary alone', () => {
    expect(reported({ summary: 'x'.repeat(110) })).toBe('');
    expect(reported({ summary: 'x'.repeat(110), priceBob: 1000 })).toContain(
      'summary: the composed meta description is 161 characters, over the 160 allowed',
    );
  });

  it('takes a description of at least 80 characters', () => {
    expect(reported({ description: 'x'.repeat(80) })).toBe('');
    expect(reported({ description: 'Dulce.' })).toContain(
      'description: expected at least 80 characters, received 6 characters',
    );
  });

  it('takes featured and inStock as booleans and nothing else', () => {
    expect(reported({ featured: 'true' })).toContain('featured: expected true or false');
    expect(reported({}, { value: without('inStock') })).toContain(
      'inStock: expected true or false',
    );
  });

  it('takes an order from 0 to 999', () => {
    expect(reported({ order: 0 })).toBe('');
    expect(reported({ order: 1000 })).toContain('order: expected an integer between 0 and 999');
  });

  it('accepts a missing photo', () => {
    expect(reported({}, { value: without('photo') })).toBe('');
    expect(
      validatePerfume(candidate({}, { value: without('photo') }), RULES).perfume?.photo,
    ).toBeUndefined();
  });

  it('takes a photo path the templates can address', () => {
    expect(reported({ photo: 'img/yara.webp' })).toContain(
      'photo: expected a path such as /img/perfumes/name.webp, received "img/yara.webp"',
    );
  });

  it('refuses a photo that is not on disk', () => {
    expect(reported({ photo: '/img/perfumes/najdia.webp' })).toContain(
      'photo: /img/perfumes/najdia.webp does not exist',
    );
  });

  it('reports every broken rule at once', () => {
    const result = validatePerfume(candidate({ brand: '', family: '', order: -1 }), RULES);

    expect(result.issues).toHaveLength(3);
  });
});
