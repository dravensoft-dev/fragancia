import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { provideArenaMetadata } from '@dravensoft/arena-angular/metadata';
import { routes } from './app.routes';
import { SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, SITE_ORIGIN } from './seo/site';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideClientHydration(withEventReplay()),
    provideArenaMetadata({
      origin: SITE_ORIGIN,
      siteName: SITE_NAME,
      robots: 'index,follow',
      description: SITE_DESCRIPTION,
      image: SITE_IMAGE,
    }),
  ],
};
