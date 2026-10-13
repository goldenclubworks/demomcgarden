// Lädt die CC0-Assets (Poly Haven, https://polyhaven.com/license) in public/. Idempotent.
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public');
const TEX = [
  ['concrete_pavers_02', 'pavers'],
  ['leafy_grass', 'grass'],
  ['oriented_strand_board', 'osb'],
  ['bitumen', 'bitumen'],
];
const MAPS = [['Diffuse', 'diff'], ['nor_gl', 'nor'], ['Rough', 'rough']];

const exists = (p) => access(p).then(() => true, () => false);
async function download(url, file) {
  if (await exists(file)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log('✓', path.relative(root, file));
}

for (const [id, name] of TEX) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  for (const [key, suffix] of MAPS) {
    await download(files[key]['1k'].jpg.url, path.join(root, 'textures', `${name}_${suffix}.jpg`));
  }
}
const hdri = await (await fetch('https://api.polyhaven.com/files/quadrangle_sunny')).json();
await download(hdri.hdri['1k'].hdr.url, path.join(root, 'hdri', 'garden_1k.hdr'));
console.log('Fertig.');
