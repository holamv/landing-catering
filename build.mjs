// Build mínimo para landing estática: inyecta el GTM container ID en index.html.
// Toma GTM_ID de las variables de entorno (Vercel) o de un .env local, reemplaza
// el token __GTM_ID__ y escribe el resultado en dist/. Sin dependencias.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

// Carga .env local si existe (en Vercel las vars ya vienen en process.env).
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const GTM_ID = (process.env.GTM_ID || '').trim();
const valid = /^GTM-[A-Z0-9]+$/.test(GTM_ID);

const src = readFileSync(join(root, 'index.html'), 'utf8');
// Si no hay ID válido dejamos el token: el guard en index.html evita cargar GTM.
const out = src.replaceAll('__GTM_ID__', valid ? GTM_ID : '__GTM_ID__');

const distDir = join(root, 'dist');
mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, 'index.html'), out);

if (valid) {
  console.log(`✓ Build OK — GTM habilitado con ${GTM_ID} → dist/index.html`);
} else {
  console.log('⚠ Build OK — sin GTM_ID válido; GTM queda inactivo. Definí GTM_ID en .env o en Vercel.');
}
