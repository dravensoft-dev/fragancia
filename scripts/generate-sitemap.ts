import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LINES, PERFUMES } from '../src/app/catalog/perfumes.generated';
import { SITE_ORIGIN } from '../src/app/seo/site';

interface SitemapEntry {
  readonly path: string;
  readonly priority: string;
  readonly changefreq: string;
}

const entries: SitemapEntry[] = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  ...LINES.map((line) => ({ path: line.path, priority: '0.9', changefreq: 'weekly' })),
  ...PERFUMES.map((perfume) => ({
    path: `/perfumes/${perfume.line}/${perfume.slug}`,
    priority: '0.8',
    changefreq: 'monthly',
  })),
];

const lastmod = new Date().toISOString().slice(0, 10);

const body = entries
  .map((entry) =>
    [
      '  <url>',
      `    <loc>${SITE_ORIGIN}${entry.path}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ].join('\n'),
  )
  .join('\n');

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  body,
  '</urlset>',
  '',
].join('\n');

writeFileSync(join(process.cwd(), 'public', 'sitemap.xml'), sitemap, 'utf8');
process.stdout.write(`sitemap: ${entries.length} routes\n`);
