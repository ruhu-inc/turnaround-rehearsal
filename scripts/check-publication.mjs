/** Keep internal documents, credentials and production artifacts out of public Git. */
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8'});
const files = new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean));
if (spawnSync('git', ['rev-parse', '--verify', 'HEAD'], {cwd: root, stdio: 'ignore'}).status === 0) {
  for (const line of git(['rev-list', '--objects', '--all']).split('\n')) {
    const space = line.indexOf(' ');
    if (space >= 0) files.add(line.slice(space + 1));
  }
}
const forbidden = file => {
  // Only the reviewed root overview is public documentation.
  if (file === 'README.md') return false;
  const path = file.toLowerCase();
  if (/^(docs|video|artifacts|\.openai)(\/|$)/.test(path) || path.startsWith('scripts/video/')) return true;
  if (/(^|\/)\.env([^/]*$)|\.(pem|key|p12|pfx)$/.test(path)) return true;
  if (/\.(md|mdx|rst|pdf|doc|docx|srt|vtt|mp4|webm|mov|wav|aac|zip)$/.test(path)) return true;
  return path.endsWith('.txt') && !path.startsWith('public/licenses/');
};
const blocked = [...files].filter(forbidden).sort();
if (blocked.length) {
  console.error('Public publication check failed. Remove these paths from publishable files and history:');
  console.error(blocked.join('\n'));
  process.exit(1);
}
console.log('Public publication check passed: no internal documents, environment files or media bundles in publishable files/history.');
