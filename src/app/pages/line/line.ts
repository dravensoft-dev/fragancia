import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ArenaEmptyState, ArenaGrid, ArenaPageHead, ArenaSection } from '@dravensoft/arena-angular';
import { Catalog } from '../../catalog/catalog';
import { LineProfile, PerfumeLine } from '../../catalog/perfume.model';
import { PerfumeCard } from '../../shared/perfume-card/perfume-card';
import { StructuredData } from '../../seo/structured-data';
import { SITE_ORIGIN } from '../../seo/site';

@Component({
  selector: 'app-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [ArenaPageHead, ArenaSection, ArenaGrid, ArenaEmptyState, PerfumeCard, StructuredData],
  templateUrl: './line.html',
  styleUrl: './line.css',
})
export class Line {
  private readonly catalog = inject(Catalog);

  readonly line = input.required<PerfumeLine>();

  protected readonly profile = computed<LineProfile>(() => {
    const profile = this.catalog.lineProfile(this.line());

    if (!profile) {
      throw new Error(`Unknown perfume line: ${this.line()}`);
    }

    return profile;
  });

  protected readonly perfumes = computed(() => this.catalog.byLine(this.line()));

  protected readonly listSchema = computed<Record<string, unknown>>(() => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: this.profile().label,
    description: this.profile().metaDescription,
    url: `${SITE_ORIGIN}${this.profile().path}`,
    numberOfItems: this.perfumes().length,
    itemListElement: this.perfumes().map((perfume, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_ORIGIN}/perfumes/${perfume.line}/${perfume.slug}`,
      name: `${perfume.brand} ${perfume.name}`,
    })),
  }));
}
