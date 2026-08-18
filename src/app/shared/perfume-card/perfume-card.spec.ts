import { APP_BASE_HREF } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Perfume } from '../../catalog/perfume.model';
import { PerfumeCard } from './perfume-card';

const PERFUME: Perfume = {
  slug: 'yara',
  name: 'Yara',
  brand: 'Lattafa',
  line: 'mujer',
  family: 'Oriental vainilla',
  notes: ['Orquídea', 'Heliotropo', 'Vainilla'],
  sizeMl: 100,
  priceBob: 320,
  concentration: 'Eau de parfum',
  summary: 'Un oriental dulce.',
  description: 'Un oriental dulce de orquídea y vainilla.',
  featured: true,
  inStock: true,
  order: 100,
  photo: '/img/perfumes/yara.webp',
};

function render(baseHref: string): ComponentFixture<PerfumeCard> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: APP_BASE_HREF, useValue: baseHref }],
  });

  const fixture = TestBed.createComponent(PerfumeCard);

  fixture.componentRef.setInput('perfume', PERFUME);
  fixture.detectChanges();

  return fixture;
}

function refs(fixture: ComponentFixture<PerfumeCard>): readonly (string | null)[] {
  const host: HTMLElement = fixture.nativeElement;

  return [
    host.querySelector('a')?.getAttribute('href') ?? null,
    host.querySelector('img')?.getAttribute('src') ?? null,
  ];
}

describe('PerfumeCard', () => {
  it('addresses the route and the photo from the root when the base href is the root', () => {
    expect(refs(render('/'))).toEqual(['/perfumes/mujer/yara', '/img/perfumes/yara.webp']);
  });

  it('carries the base href into both when the site is served from a subpath', () => {
    expect(refs(render('/fragancia/'))).toEqual([
      '/fragancia/perfumes/mujer/yara',
      '/fragancia/img/perfumes/yara.webp',
    ]);
  });
});
