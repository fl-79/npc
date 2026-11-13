import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

// The Revit export lives in ../exports and is served as-is at /exports/*.
// The owner's program (room labels, edits) lives in ../program and is served read-only at /program/*.
const exportsDir = resolve(__dirname, '..', 'exports');
const programDir = resolve(__dirname, '..', 'program');

export default defineConfig({
  server: { port: 5174, strictPort: false, fs: { allow: [resolve(__dirname, '..')] } },
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { main: resolve(__dirname, 'index.html'), game: resolve(__dirname, 'game.html') } } },
  plugins: [
    {
      name: 'serve-exports-and-program',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = (req.url || '').split('?')[0];
          if (url.startsWith('/exports/')) {
            const file = resolve(exportsDir, url.slice('/exports/'.length));
            // a file kept compressed in the repository (meshes.json is over GitHub's 100 MB limit): served as gzip, the browser
            // unpacks it; x-unpacked-length is the size for the loading bar (the last four bytes of a gzip file) (2026-11-13)
            if (!existsSync(file) && existsSync(file + '.gz')) {
              const buf = readFileSync(file + '.gz');
              res.setHeader('content-type', 'application/json'); res.setHeader('content-encoding', 'gzip');
              res.setHeader('x-unpacked-length', String(buf.readUInt32LE(buf.length - 4)));
              res.end(buf); return;
            }
            if (!existsSync(file)) { res.statusCode = 404; res.end('not found: ' + file); return; }
            req.url = '/@fs/' + file.split('\\').join('/');
            return next();
          }
          if (url.startsWith('/program/')) {
            const file = resolve(programDir, url.slice('/program/'.length));
            if (!existsSync(file)) { res.statusCode = 404; res.end('not found: ' + file); return; }
            res.setHeader('content-type', file.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8');
            res.setHeader('cache-control', 'no-store');
            res.end(readFileSync(file));
            return;
          }
          next();
        });
      },
    },
  ],
});
