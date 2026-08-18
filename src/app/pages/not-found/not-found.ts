import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ArenaAction, ArenaButton, ArenaEmptyState } from '@dravensoft/arena-angular';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [ArenaEmptyState, ArenaAction, ArenaButton],
  template: `
    <div class="arena-band arena-stack arena-stack--section">
      <arena-empty-state
        icon="ph-light ph-compass"
        headingLevel="h1"
        title="Esta página no existe"
        message="El enlace que seguiste no lleva a ningún frasco del catálogo. Vuelve al inicio y empieza por una de las dos líneas."
      >
        <arena-button action icon="ph-bold ph-arrow-left" (click)="goHome()">
          Volver al inicio
        </arena-button>
      </arena-empty-state>
    </div>
  `,
})
export class NotFound {
  private readonly router = inject(Router);

  protected goHome(): void {
    void this.router.navigateByUrl('/');
  }
}
