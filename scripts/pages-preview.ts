import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const basePath = process.argv[2];

if (!basePath || !basePath.startsWith('/') || !basePath.endsWith('/')) {
  process.stderr.write('pages-preview: pass a base path such as /fragancia/\n');
  process.exit(1);
}

const browser = join(process.cwd(), 'dist', 'fragancia', 'browser');

rmSync(join(browser, 'admin'), { recursive: true, force: true });

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const files = filesUnder(browser);
let rebased = 0;
let slept = 0;

for (const file of files) {
  if (file.endsWith('.css')) {
    const source = readFileSync(file, 'utf8');
    const rewritten = source.replace(/url\((["']?)\/(?!\/)/g, `url($1${basePath}`);

    if (rewritten !== source) {
      writeFileSync(file, rewritten, 'utf8');
      rebased += 1;
    }
  }

  if (file.endsWith('.html')) {
    const source = readFileSync(file, 'utf8');
    const rewritten = source.replace(
      /<meta name="robots" content="[^"]*">/g,
      '<meta name="robots" content="noindex,nofollow">',
    );

    if (rewritten !== source) {
      writeFileSync(file, rewritten, 'utf8');
      slept += 1;
    }
  }
}

writeFileSync(join(browser, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
rmSync(join(browser, 'sitemap.xml'), { force: true });

process.stdout.write(
  `pages-preview: ${rebased} stylesheets rebased on ${basePath}, ${slept} pages set to noindex\n`,
);
