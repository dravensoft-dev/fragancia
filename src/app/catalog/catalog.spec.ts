import { TestBed } from '@angular/core/testing';
import { Catalog } from './catalog';

describe('Catalog', () => {
  let catalog: Catalog;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    catalog = TestBed.inject(Catalog);
  });

  it('returns only perfumes of the requested line', () => {
    const men = catalog.byLine('hombre');

    expect(men.length).toBeGreaterThan(0);
    expect(men.every((perfume) => perfume.line === 'hombre')).toBe(true);
  });

  it('keeps every slug unique inside a line', () => {
    for (const profile of catalog.lines()) {
      const slugs = catalog.byLine(profile.line).map((perfume) => perfume.slug);

      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it('resolves a perfume by its line and slug', () => {
    expect(catalog.bySlug('mujer', 'yara')?.brand).toBe('Lattafa');
    expect(catalog.bySlug('hombre', 'yara')).toBeUndefined();
  });
});
