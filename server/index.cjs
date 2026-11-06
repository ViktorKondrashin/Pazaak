const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { GameServer } = require('./game-server.cjs');
const root = path.resolve(__dirname, '../dist/pazaak/browser');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function createApplication(options = {}) {
  const game = new GameServer(options);
  const sessionLimits = new Map();
  const timer = setInterval(() => {
    try {
      game.maintain();
    } catch (error) {
      console.error('Game maintenance:', error.message);
    }
  }, 250);
  timer.unref();
  const json = (res, status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(body));
  };
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/api/health' && req.method === 'GET')
        return json(res, 200, { ok: true, service: 'pazaak', version: '5.1.0' });
      if (pathname.startsWith('/api/')) {
        requireHttp(
          (pathname === '/api/state' && req.method === 'GET') || req.method === 'POST',
          405,
          'METHOD',
          'Метод запроса не поддерживается',
        );
        if (req.headers.origin) {
          const origin = new URL(req.headers.origin);
          requireHttp(
            origin.host === req.headers.host,
            403,
            'ORIGIN',
            'Запрос с другого сайта запрещён',
          );
        }
        let body = {};
        if (req.method === 'POST') {
          requireHttp(
            (req.headers['content-type'] || '').split(';')[0] === 'application/json',
            415,
            'CONTENT_TYPE',
            'Требуется application/json',
          );
          let size = 0,
            chunks = [];
          for await (const chunk of req) {
            size += chunk.length;
            requireHttp(size <= 16384, 413, 'BODY_SIZE', 'Слишком большой запрос');
            chunks.push(chunk);
          }
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            requireHttp(false, 400, 'JSON', 'Некорректный JSON');
          }
        }
        if (pathname === '/api/session' && req.method === 'POST') {
          const now = Date.now();
          for (const [key, entry] of sessionLimits)
            if (now > entry.until) sessionLimits.delete(key);
          // Nginx is the only trusted peer supplying X-Real-IP, and the API binds to loopback.
          const key = req.headers['x-real-ip'] || req.socket.remoteAddress;
          const entry = sessionLimits.get(key) || { count: 0, until: now + 60_000 };
          requireHttp(
            ++entry.count <= 60,
            429,
            'RATE',
            'Слишком много новых сеансов. Подождите минуту',
          );
          sessionLimits.set(key, entry);
          game.maintain();
          return json(res, 201, game.createSession());
        }
        const token = /^Bearer ([A-Za-z0-9_-]+)$/.exec(req.headers.authorization || '')?.[1];
        const uid = game.authenticate(token);
        return json(res, 200, game.request(uid, pathname.slice('/api/'.length), body));
      }
      requireHttp(
        req.method === 'GET' || req.method === 'HEAD',
        405,
        'METHOD',
        'Method not allowed',
      );
      let filename = path.resolve(root, '.' + decodeURIComponent(pathname));
      requireHttp(
        filename === root || filename.startsWith(root + path.sep),
        403,
        'PATH',
        'Forbidden',
      );
      try {
        if (!(await fs.stat(filename)).isFile()) filename = path.join(root, 'index.html');
      } catch {
        requireHttp(!path.extname(pathname), 404, 'NOT_FOUND', 'Not found');
        filename = path.join(root, 'index.html');
      }
      const data = await fs.readFile(filename);
      res.writeHead(200, {
        'Content-Type': types[path.extname(filename)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      const code = error.code || 'SERVER';
      const status =
        error.status ||
        (code === 'AUTH'
          ? 401
          : ['MEMBER', 'ACTION_OWNER'].includes(code)
            ? 403
            : code === 'NOT_FOUND'
              ? 404
              : code === 'CAPACITY'
                ? 503
                : error.name === 'GameError'
                  ? 409
                  : 500);
      if (status === 500) console.error('Request failed:', error.message);
      if (!res.headersSent)
        json(res, status, { code, message: status === 500 ? 'Ошибка сервера' : error.message });
      else res.end();
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.on('close', () => {
    clearInterval(timer);
    game.close();
  });
  return { server, game };
}

function requireHttp(condition, status, code, message) {
  if (!condition) throw Object.assign(new Error(message), { status, code });
}

if (require.main === module) {
  const host = process.env.HOST || '127.0.0.1',
    port = Number(process.env.PORT || 3000);
  const { server } = createApplication({
    database: process.env.DATABASE_PATH || path.resolve(__dirname, '../data/pazaak.sqlite'),
  });
  server.listen(port, host, () => console.log(`Pazaak: http://${host}:${port}`));
  server.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      server.close();
      server.closeIdleConnections();
    });
}
module.exports = { createApplication };
