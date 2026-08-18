import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ArenaActions,
  ArenaButton,
  ArenaFigureSlot,
  ArenaGrid,
  ArenaHero,
  ArenaSection,
} from '@dravensoft/arena-angular';
import { Catalog } from '../../catalog/catalog';
import { PerfumeCard } from '../../shared/perfume-card/perfume-card';
import { BrandMark } from '../../shared/brand-mark/brand-mark';
import { StructuredData } from '../../seo/structured-data';
import {
  CONTACT_CITY,
  CONTACT_COUNTRY,
  CONTACT_INSTAGRAM,
  CONTACT_INSTAGRAM_URL,
  CONTACT_PHONE,
  CONTACT_PHONE_E164,
  CONTACT_WHATSAPP_URL,
  SITE_DESCRIPTION,
  SITE_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
} from '../../seo/site';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [
    RouterLink,
    ArenaHero,
    ArenaFigureSlot,
    ArenaActions,
    ArenaButton,
    ArenaSection,
    ArenaGrid,
    PerfumeCard,
    BrandMark,
    StructuredData,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly router = inject(Router);
  private readonly catalog = inject(Catalog);

  protected readonly siteName = SITE_NAME;
  protected readonly city = CONTACT_CITY;
  protected readonly country = CONTACT_COUNTRY;
  protected readonly phone = CONTACT_PHONE;
  protected readonly whatsapp = CONTACT_WHATSAPP_URL;
  protected readonly instagram = CONTACT_INSTAGRAM;
  protected readonly instagramUrl = CONTACT_INSTAGRAM_URL;

  protected readonly featured = computed(() => this.catalog.featured());
  protected readonly lines = computed(() => this.catalog.lines());

  protected readonly websiteSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    inLanguage: 'es-BO',
    description: SITE_DESCRIPTION,
  };

  protected readonly storeSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${SITE_ORIGIN}/#tienda`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_ORIGIN,
    image: SITE_IMAGE,
    telephone: CONTACT_PHONE_E164,
    priceRange: 'Bs 260 - Bs 560',
    currenciesAccepted: 'BOB',
    sameAs: [CONTACT_INSTAGRAM_URL],
    address: {
      '@type': 'PostalAddress',
      addressLocality: CONTACT_CITY,
      addressCountry: 'BO',
    },
    areaServed: {
      '@type': 'City',
      name: CONTACT_CITY,
    },
    makesOffer: this.catalog.all().map((perfume) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Product', name: `${perfume.brand} ${perfume.name}` },
      price: perfume.priceBob,
      priceCurrency: 'BOB',
      url: `${SITE_ORIGIN}/perfumes/${perfume.line}/${perfume.slug}`,
    })),
  };

  protected goTo(path: string): void {
    void this.router.navigateByUrl(path);
  }
}
