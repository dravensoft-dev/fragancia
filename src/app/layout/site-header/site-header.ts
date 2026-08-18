import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  ArenaActions,
  ArenaAppBar,
  ArenaAppLogo,
  ArenaBrand,
  ArenaNav,
} from '@dravensoft/arena-angular';
import { BrandMark } from '../../shared/brand-mark/brand-mark';
import { CONTACT_WHATSAPP_URL, SITE_NAME } from '../../seo/site';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [
    RouterLink,
    RouterLinkActive,
    ArenaAppBar,
    ArenaAppLogo,
    ArenaBrand,
    ArenaNav,
    ArenaActions,
    BrandMark,
  ],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {
  protected readonly siteName = SITE_NAME;
  protected readonly whatsapp = CONTACT_WHATSAPP_URL;
}
