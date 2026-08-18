import { RenderMode, ServerRoute } from '@angular/ssr';
import { PERFUMES } from './catalog/perfumes.data';

function slugsOf(line: string): Promise<Record<string, string>[]> {
  return Promise.resolve(
    PERFUMES.filter((perfume) => perfume.line === line).map((perfume) => ({ slug: perfume.slug })),
  );
}

export const serverRoutes: ServerRoute[] = [
  {
    path: 'perfumes/hombre/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () => slugsOf('hombre'),
  },
  {
    path: 'perfumes/mujer/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () => slugsOf('mujer'),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
