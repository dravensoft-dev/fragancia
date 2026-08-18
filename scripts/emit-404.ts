import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const browser = join(process.cwd(), 'dist', 'fragancia', 'browser');
const source = join(browser, '404', 'index.html');
const target = join(browser, '404.html');

if (!existsSync(source)) {
  process.stderr.write('emit-404: the /404 route was not prerendered\n');
  process.exit(1);
}

copyFileSync(source, target);
process.stdout.write('emit-404: wrote 404.html\n');
