import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ArenaMain, ArenaSkipLink } from '@dravensoft/arena-angular';
import { SiteHeader } from './layout/site-header/site-header';
import { SiteFooter } from './layout/site-footer/site-footer';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'arena-shell arena-stack arena-stack--section' },
  imports: [RouterOutlet, ArenaSkipLink, ArenaMain, SiteHeader, SiteFooter],
  templateUrl: './app.html',
})
export class App {}
