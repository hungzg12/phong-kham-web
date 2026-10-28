import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, openSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portArg = process.argv.indexOf('--port');
const port = Number(portArg < 0 ? 3000 : process.argv[portArg + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port.');
const url = `http://127.0.0.1:${port}`;
const noBrowser = process.argv.includes('--no-browser');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function healthy() {
  try {
    const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    return response.ok && data.service === 'antam-clinic' && data.status === 'ok';
  } catch { return false; }
}
function openBrowser() {
  if (noBrowser) return;
  if (process.platform === 'win32') {
    const browser = spawn('explorer.exe', [url], { detached: true, windowsHide: true, stdio: 'ignore' });
    browser.unref();
  }
}
function npm(args) {
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm.cmd', ...args], { cwd: root, stdio: 'inherit', windowsHide: true })
    : spawnSync('npm', args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed.`);
}
function latestModification(target) {
  if (!existsSync(target)) return 0;
  if (statSync(target).isFile()) return statSync(target).mtimeMs;
  return Math.max(0, ...readdirSync(target).map(name => latestModification(path.join(target, name))));
}

if (await healthy()) {
  console.log(`An Tam Clinic is running: ${url}`);
  openBrowser();
  process.exit(0);
}
if (!existsSync(path.join(root, 'node_modules', 'next'))) npm(['ci', '--no-audit', '--no-fund']);
npm(['run', 'db:start']);
const buildId = path.join(root, '.next', 'BUILD_ID');
const buildTime = existsSync(buildId) ? statSync(buildId).mtimeMs : 0;
const changed = ['src', 'database', 'next.config.ts', 'package.json', 'package-lock.json', 'postcss.config.mjs']
  .some(name => latestModification(path.join(root, name)) > buildTime);
if (!buildTime || changed || process.argv.includes('--rebuild')) npm(['run', 'build']);

const runtime = path.join(root, '.data', 'runtime');
mkdirSync(runtime, { recursive: true });
const stdout = openSync(path.join(runtime, `server-${port}.log`), 'a');
const stderr = openSync(path.join(runtime, `server-${port}.error.log`), 'a');
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const server = spawn(process.execPath, [nextCli, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, detached: true, windowsHide: true, stdio: ['ignore', stdout, stderr]
});
server.on('error', error => console.error('Server launch failed:', error.message));
server.unref();
closeSync(stdout);
closeSync(stderr);
writeFileSync(path.join(runtime, `server-${port}.json`), JSON.stringify({ pid: server.pid, root, port }));
for (let attempt = 0; attempt < 40; attempt++) {
  await sleep(500);
  if (await healthy()) {
    console.log(`An Tam Clinic is ready: ${url}`);
    openBrowser();
    process.exit(0);
  }
  try { process.kill(server.pid, 0); } catch { throw new Error(`Server stopped. Read .data/runtime/server-${port}.error.log. Check whether another app uses this port.`); }
}
throw new Error(`Server not ready. Read .data/runtime/server-${port}.error.log.`);
