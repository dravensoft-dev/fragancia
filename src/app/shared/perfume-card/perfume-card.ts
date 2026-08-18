import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ArenaCard, ArenaFallback, ArenaFigure, ArenaMedia } from '@dravensoft/arena-angular';
import { Perfume } from '../../catalog/perfume.model';

@Component({
  selector: 'app-perfume-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [ArenaCard, ArenaFigure, ArenaMedia, ArenaFallback],
  templateUrl: './perfume-card.html',
  styleUrl: './perfume-card.css',
})
export class PerfumeCard {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly perfume = input.required<Perfume>();

  protected readonly path = computed(
    () => `/perfumes/${this.perfume().line}/${this.perfume().slug}`,
  );

  protected readonly href = computed(() => this.location.prepareExternalUrl(this.path()));

  protected readonly photo = computed(() => {
    const photo = this.perfume().photo;

    return photo ? this.location.prepareExternalUrl(photo) : undefined;
  });

  protected readonly alt = computed(
    () => `Frasco de ${this.perfume().name} de ${this.perfume().brand}`,
  );

  protected open(): void {
    void this.router.navigateByUrl(this.path());
  }
}
