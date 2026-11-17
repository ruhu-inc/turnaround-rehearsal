/** Scan publishable files and all reachable Git history without printing secrets. */
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtemp, mkdir, copyFile, lstat, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const scanner = process.env.GITLEAKS_BIN || 'gitleaks';
const version = spawnSync(scanner, ['version'], {encoding: 'utf8'});
if (version.error || version.status !== 0) {
  console.error('Install Gitleaks or set GITLEAKS_BIN to its executable path.');
  process.exit(1);
}
const snapshot = await mkdtemp(join(tmpdir(), 'turnaround-secret-scan-'));
try {
  const files = new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {cwd: root}).toString().split('\0').filter(Boolean));
  let copied = 0;
  for (const file of files) {
    const source = join(root, file);
    let info;
    try { info = await lstat(source); } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (!info.isFile()) continue;
    const target = join(snapshot, file);
    await mkdir(dirname(target), {recursive: true});
    await copyFile(source, target);
    copied++;
  }
  console.log(`Checking all reachable Git history and ${copied} publishable working files.`);
  for (const args of [['git', '--log-opts=--all', root], ['dir', snapshot]]) {
    const result = spawnSync(scanner, [...args, '--redact=100', '--no-banner', '--ignore-gitleaks-allow'], {cwd: root, stdio: 'inherit'});
    if (result.error) throw result.error;
    if (result.status !== 0) { process.exitCode = result.status || 1; break; }
  }
} finally {
  await rm(snapshot, {recursive: true, force: true});
}
