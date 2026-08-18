import { Routes } from '@angular/router';
import { arenaRouteMeta } from '@dravensoft/arena-angular/metadata';
import { LINES } from './catalog/perfumes.generated';
import { SITE_DESCRIPTION, SITE_NAME } from './seo/site';

const [men, women] = LINES;

export const routes: Routes = [
  {
    path: '',
    title: SITE_NAME,
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    data: arenaRouteMeta({ description: SITE_DESCRIPTION, type: 'website' }),
  },
  {
    path: 'perfumes/hombre',
    title: men.label,
    loadComponent: () => import('./pages/line/line').then((m) => m.Line),
    data: { line: men.line, ...arenaRouteMeta({ description: men.metaDescription }) },
  },
  {
    path: 'perfumes/hombre/:slug',
    loadComponent: () =>
      import('./pages/perfume-detail/perfume-detail').then((m) => m.PerfumeDetail),
    data: { line: men.line },
  },
  {
    path: 'perfumes/mujer',
    title: women.label,
    loadComponent: () => import('./pages/line/line').then((m) => m.Line),
    data: { line: women.line, ...arenaRouteMeta({ description: women.metaDescription }) },
  },
  {
    path: 'perfumes/mujer/:slug',
    loadComponent: () =>
      import('./pages/perfume-detail/perfume-detail').then((m) => m.PerfumeDetail),
    data: { line: women.line },
  },
  {
    path: '404',
    title: 'Página no encontrada',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
    data: arenaRouteMeta({ robots: 'noindex,follow' }),
  },
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
    data: arenaRouteMeta({ robots: 'noindex,follow' }),
  },
];
