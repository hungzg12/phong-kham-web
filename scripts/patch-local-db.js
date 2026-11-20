import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'scripts', 'local-db.mjs');
let code = readFileSync(file, 'utf8');

const target = "const pgRoot=path.join(process.env.ProgramFiles||'C:/Program Files','PostgreSQL');";
const replacement = `const candidateRoots = [
  process.env.POSTGRES_HOME,
  'Z:/Tailieu/PostgreSQL',
  'Z:/PostgreSQL',
  path.join(process.env.ProgramFiles || 'C:/Program Files', 'PostgreSQL')
].filter(Boolean);
let pgRoot = candidateRoots.find(r => existsSync(r) && (existsSync(path.join(r, 'bin', 'initdb.exe')) || readdirSync(r).some(v => existsSync(path.join(r, v, 'bin', 'initdb.exe'))))) || candidateRoots[0];`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  writeFileSync(file, code, 'utf8');
  console.log('Successfully patched local-db.mjs to support Z:/Tailieu/PostgreSQL!');
} else {
  console.log('Target line already patched or not found.');
}
