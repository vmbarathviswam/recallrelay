import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const types = { 'index.html': 'text/html', 'app.js': 'text/javascript', 'browser-replay.js': 'text/javascript', 'style.css': 'text/css', 'health.json': 'application/json' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1:4180').pathname;
  const file = pathname.replace(/^\/recallrelay\//, '').replace(/^\//, '') || 'index.html';
  if (!types[file]) { response.writeHead(404); return response.end('Not found'); }
  try { response.writeHead(200, { 'Content-Type': types[file], 'Cache-Control': 'no-store' }); response.end(await readFile('pages/' + file)); }
  catch { response.writeHead(503); response.end('Build the replay with npm run build:demo first.'); }
});
server.listen(4180, '127.0.0.1', () => console.log('Public-replay preview: http://127.0.0.1:4180/recallrelay/'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
