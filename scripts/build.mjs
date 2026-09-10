import * as esbuild from 'esbuild';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const out = join(root, 'dist');
const watch = process.argv.includes('--watch');

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

async function build() {
  mkdirSync(join(out, 'sidepanel'), { recursive: true });
  mkdirSync(join(out, 'assets', 'icons'), { recursive: true });

  const shared = {
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    logLevel: 'info',
  };

  if (watch) {
    const ctx1 = await esbuild.context({
      ...shared,
      entryPoints: [join(root, 'src/background/service-worker.ts')],
      outfile: join(out, 'service-worker.js'),
    });
    const ctx2 = await esbuild.context({
      ...shared,
      entryPoints: [join(root, 'src/sidepanel/main.ts')],
      outfile: join(out, 'sidepanel/main.js'),
    });
    await Promise.all([ctx1.watch(), ctx2.watch()]);
    console.log('Watching for changes…');
    return;
  }

  await esbuild.build({
    ...shared,
    entryPoints: [join(root, 'src/background/service-worker.ts')],
    outfile: join(out, 'service-worker.js'),
  });

  await esbuild.build({
    ...shared,
    entryPoints: [join(root, 'src/sidepanel/main.ts')],
    outfile: join(out, 'sidepanel/main.js'),
  });

  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  manifest.background = {
    service_worker: 'service-worker.js',
    type: 'module',
  };
  manifest.side_panel = { default_path: 'sidepanel/index.html' };
  manifest.icons = {
    16: 'assets/icons/icon16.png',
    48: 'assets/icons/icon48.png',
    128: 'assets/icons/icon128.png',
  };
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskMate</title>
    <link rel="stylesheet" href="./styles/app.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`;
  writeFileSync(join(out, 'sidepanel/index.html'), html);

  copyDir(join(root, 'src/sidepanel/styles'), join(out, 'sidepanel/styles'));
  copyDir(join(root, 'src/assets/icons'), join(out, 'assets/icons'));

  console.log('Build complete → dist/');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
