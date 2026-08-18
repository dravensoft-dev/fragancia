import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArenaAppLogo, ArenaSiteFooter } from '@dravensoft/arena-angular';
import { BrandMark } from '../../shared/brand-mark/brand-mark';
import {
  CONTACT_CITY,
  CONTACT_COUNTRY,
  CONTACT_INSTAGRAM,
  CONTACT_INSTAGRAM_URL,
  CONTACT_PHONE,
  CONTACT_WHATSAPP_URL,
  SITE_NAME,
} from '../../seo/site';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  imports: [RouterLink, ArenaSiteFooter, ArenaAppLogo, BrandMark],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
})
export class SiteFooter {
  protected readonly siteName = SITE_NAME;
  protected readonly city = CONTACT_CITY;
  protected readonly country = CONTACT_COUNTRY;
  protected readonly phone = CONTACT_PHONE;
  protected readonly whatsapp = CONTACT_WHATSAPP_URL;
  protected readonly instagram = CONTACT_INSTAGRAM;
  protected readonly instagramUrl = CONTACT_INSTAGRAM_URL;
  protected readonly year = new Date().getFullYear();
}
