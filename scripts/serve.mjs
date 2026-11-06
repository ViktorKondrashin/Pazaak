import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const port = Number(argument('--port', process.env.PORT || '3000'));
const host = argument('--host', process.env.HOST || '127.0.0.1');
const { createApplication } = require('../server/index.cjs');
const { server } = createApplication({
  database:
    process.env.DATABASE_PATH ||
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/pazaak.sqlite'),
});
server.listen(port, host, () => {
  const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
  console.log(`Pazaak: ${url}`);
  if (process.argv.includes('--open')) {
    const command =
      process.platform === 'win32'
        ? 'explorer.exe'
        : process.platform === 'darwin'
          ? 'open'
          : 'xdg-open';
    const child = spawn(command, [url], { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => {});
    child.unref();
  }
});
server.on('error', (error) => {
  console.error(error.message);
  server.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close();
    server.closeIdleConnections();
  });
