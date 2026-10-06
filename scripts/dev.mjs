import { spawn, spawnSync } from 'node:child_process';
const build = spawnSync('npm', ['run', 'build', '-w', '@task-board/contracts'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const children = ['@task-board/api', '@task-board/web'].map(workspace =>
  spawn('npm', ['run', 'dev', '-w', workspace], { stdio: 'inherit' }));
let stopping = false;
const stop = () => { if (stopping) return; stopping = true; children.forEach(child => child.kill('SIGTERM')); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach(child => child.on('exit', code => { stop(); process.exitCode = code ?? 0; }));
