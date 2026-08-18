import { APP_BASE_HREF, DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideArenaMetadata } from '@dravensoft/arena-angular/metadata';
import { Catalog } from '../../catalog/catalog';
import { LineProfile, Perfume } from '../../catalog/perfume.model';
import { SITE_NAME, SITE_ORIGIN } from '../../seo/site';
import { PerfumeDetail } from './perfume-detail';

const PROFILE: LineProfile = {
  line: 'mujer',
  path: '/perfumes/mujer',
  label: 'Perfumes para mujer',
  descriptor: 'Femme',
  sloganLead: 'La elegancia',
  slogan: 'se lleva en la piel.',
  lede: 'La línea femenina de la casa.',
  metaDescription: 'Perfumes árabes para mujer en Cochabamba, eau de parfum original.',
  rosegold: true,
};

const PERFUME: Perfume = {
  slug: 'yara',
  name: 'Yara',
  brand: 'Lattafa',
  line: 'mujer',
  family: 'Floral gourmand',
  notes: ['Orquídea', 'Vainilla'],
  sizeMl: 100,
  priceBob: 290,
  concentration: 'Eau de parfum',
  summary: 'Orquídea y vainilla, dulce y reconocible.',
  description: 'El femenino más vendido de la casa, dulce sin empalagar y de estela larga.',
  featured: true,
  inStock: true,
  order: 10,
  photo: '/img/perfumes/yara.webp',
};

function render(perfume: Perfume): ComponentFixture<PerfumeDetail> {
  const catalog: Partial<Catalog> = {
    lineProfile: () => PROFILE,
    bySlug: () => perfume,
  };

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideArenaMetadata({ origin: SITE_ORIGIN, siteName: SITE_NAME }),
      { provide: APP_BASE_HREF, useValue: '/' },
      { provide: Catalog, useValue: catalog },
    ],
  });

  const fixture = TestBed.createComponent(PerfumeDetail);

  fixture.componentRef.setInput('line', perfume.line);
  fixture.componentRef.setInput('slug', perfume.slug);
  fixture.detectChanges();

  return fixture;
}

function schemaOf(fixture: ComponentFixture<PerfumeDetail>): string {
  fixture.detectChanges();

  const document = TestBed.inject(DOCUMENT);

  return document.head.querySelector('script[data-schema="product-yara"]')?.textContent ?? '';
}

function textOf(fixture: ComponentFixture<PerfumeDetail>): string {
  const host: HTMLElement = fixture.nativeElement;

  return host.textContent ?? '';
}

describe('PerfumeDetail', () => {
  it('offers a stocked perfume as available', () => {
    const fixture = render(PERFUME);

    expect(schemaOf(fixture)).toContain('https://schema.org/InStock');
    expect(textOf(fixture)).toContain('Consultar por Yara');
    expect(fixture.nativeElement.querySelector('arena-badge')).toBeNull();
  });

  it('says out of stock in the page and in the offer', () => {
    const fixture = render({ ...PERFUME, inStock: false });

    expect(schemaOf(fixture)).toContain('https://schema.org/OutOfStock');
    expect(schemaOf(fixture)).not.toContain('https://schema.org/InStock');
    expect(textOf(fixture)).toContain('Agotado');
    expect(textOf(fixture)).toContain('Consultar disponibilidad');
  });
});
