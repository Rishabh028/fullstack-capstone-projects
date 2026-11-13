import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting Real-Time Collaborative Workspace Services...\n');

// 1. Start WebSocket CRDT Server
const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const wsServer = spawn(npxCmd, ['tsx', 'server/websocket-server.ts'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: '1234' },
});

wsServer.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((l: string) => {
    if (l) console.log(`\x1b[35m[WS SERVER]\x1b[0m ${l}`);
  });
});

wsServer.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((l: string) => {
    if (l) console.error(`\x1b[31m[WS ERR]\x1b[0m ${l}`);
  });
});

// 2. Start Next.js Web App
const nextApp = spawn(npmCmd, ['run', 'dev'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: '3000' },
});

nextApp.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((l: string) => {
    if (l) console.log(`\x1b[36m[NEXT APP]\x1b[0m ${l}`);
  });
});

nextApp.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((l: string) => {
    if (l) console.error(`\x1b[33m[NEXT ERR]\x1b[0m ${l}`);
  });
});

const cleanup = () => {
  console.log('\n🛑 Shutting down services...');
  wsServer.kill();
  nextApp.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
