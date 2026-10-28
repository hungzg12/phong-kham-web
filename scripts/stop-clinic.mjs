import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portArg = process.argv.indexOf('--port');
const port = Number(portArg < 0 ? 3000 : process.argv[portArg + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port.');
const file = path.join(root, '.data', 'runtime', `server-${port}.json`);
if (!existsSync(file)) {
  console.log('No server started by this launcher. No process was stopped.');
  process.exit(0);
}
const info = JSON.parse(readFileSync(file, 'utf8'));
if (path.resolve(info.root) !== root || !Number.isInteger(info.pid) || info.pid < 1) throw new Error('Invalid server ownership record.');
try { process.kill(info.pid, 0); } catch {
  unlinkSync(file);
  console.log('Website was already stopped.');
  process.exit(0);
}
if (process.platform !== 'win32') throw new Error('This launcher ownership check currently supports Windows only.');
const command = `Get-CimInstance Win32_Process -Filter "ProcessId=${info.pid}" | Select-Object -ExpandProperty CommandLine`;
const commandLine = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8', windowsHide: true }).trim();
const expectedCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!commandLine.toLowerCase().includes(expectedCli.toLowerCase())) throw new Error('Process identity changed. Refusing to stop an unrelated process.');
process.kill(info.pid);
unlinkSync(file);
console.log('An Tam Clinic website stopped. The database is still available.');
