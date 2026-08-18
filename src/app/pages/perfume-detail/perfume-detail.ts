import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ArenaMetadataService } from '@dravensoft/arena-angular/metadata';
import {
  ArenaBreadcrumbs,
  ArenaCrumb,
  ArenaFallback,
  ArenaFigure,
  ArenaKeyValue,
  ArenaKeyValueRow,
  ArenaMedia,
  ArenaTag,
} from '@dravensoft/arena-angular';
import { Catalog } from '../../catalog/catalog';
import { Perfume, PerfumeLine } from '../../catalog/perfume.model';
import { StructuredData } from '../../seo/structured-data';
import {
  CONTACT_WHATSAPP_URL,
  PRICE_CURRENCY,
  SITE_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
} from '../../seo/site';

@Component({
  selector: 'app-perfume-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [
    ArenaBreadcrumbs,
    ArenaFigure,
    ArenaMedia,
    ArenaFallback,
    ArenaKeyValue,
    ArenaTag,
    StructuredData,
  ],
  templateUrl: './perfume-detail.html',
  styleUrl: './perfume-detail.css',
})
export class PerfumeDetail {
  private readonly catalog = inject(Catalog);
  private readonly router = inject(Router);
  private readonly metadata = inject(ArenaMetadataService);
  private readonly location = inject(Location);

  readonly line = input.required<PerfumeLine>();
  readonly slug = input.required<string>();

  protected readonly whatsapp = CONTACT_WHATSAPP_URL;
  protected readonly origin = SITE_ORIGIN;

  protected readonly perfume = computed<Perfume>(() => {
    const perfume = this.catalog.bySlug(this.line(), this.slug());

    if (!perfume) {
      throw new Error(`Unknown perfume: ${this.line()}/${this.slug()}`);
    }

    return perfume;
  });

  protected readonly profile = computed(() => this.catalog.lineProfile(this.line()));

  protected readonly path = computed(
    () => `/perfumes/${this.perfume().line}/${this.perfume().slug}`,
  );

  protected readonly alt = computed(
    () => `Frasco de ${this.perfume().name} de ${this.perfume().brand}`,
  );

  protected readonly photo = computed(() => {
    const photo = this.perfume().photo;

    return photo ? this.location.prepareExternalUrl(photo) : undefined;
  });

  protected readonly crumbs = computed<readonly ArenaCrumb[]>(() => [
    { label: 'Inicio', href: this.location.prepareExternalUrl('/') },
    {
      label: this.profile()?.label ?? '',
      href: this.location.prepareExternalUrl(this.profile()?.path ?? '/'),
    },
    { label: this.perfume().name },
  ]);

  protected readonly rows = computed<readonly ArenaKeyValueRow[]>(() => [
    { term: 'Marca', value: this.perfume().brand },
    { term: 'Familia olfativa', value: this.perfume().family },
    { term: 'Concentración', value: this.perfume().concentration },
    { term: 'Contenido', value: `${this.perfume().sizeMl} ml`, numeric: true },
  ]);

  protected readonly total = computed<ArenaKeyValueRow>(() => ({
    term: 'Precio',
    value: `Bs ${this.perfume().priceBob}`,
    numeric: true,
  }));

  protected readonly productSchema = computed<Record<string, unknown>>(() => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${this.perfume().brand} ${this.perfume().name}`,
    sku: this.perfume().slug,
    description: this.perfume().description,
    brand: { '@type': 'Brand', name: this.perfume().brand },
    category: this.perfume().family,
    image: this.perfume().photo ? `${SITE_ORIGIN}${this.perfume().photo}` : SITE_IMAGE,
    audience: {
      '@type': 'PeopleAudience',
      suggestedGender: this.perfume().line === 'hombre' ? 'male' : 'female',
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_ORIGIN}${this.path()}`,
      price: this.perfume().priceBob,
      priceCurrency: PRICE_CURRENCY,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Store', name: SITE_NAME },
    },
  }));

  constructor() {
    effect(() => {
      const perfume = this.perfume();

      this.metadata.apply({
        title: `${perfume.brand} ${perfume.name}`,
        description: `${perfume.summary} ${perfume.concentration} de ${perfume.sizeMl} ml por Bs ${perfume.priceBob} en Cochabamba.`,
        canonical: this.path(),
        image: perfume.photo ? `${SITE_ORIGIN}${perfume.photo}` : SITE_IMAGE,
        type: 'product',
        robots: 'index,follow',
      });
    });
  }

  protected goTo(crumb: ArenaCrumb): void {
    if (crumb.href) {
      void this.router.navigateByUrl(this.location.normalize(crumb.href) || '/');
    }
  }
}
