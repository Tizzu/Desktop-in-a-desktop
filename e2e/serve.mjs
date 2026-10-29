// Server statico minimale per i test: serve solo la build dell'estensione, solo su 127.0.0.1.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve('.output/chrome-mv3');
const port = Number(process.env.E2E_PORT ?? 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

http
  .createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
    if (!file.startsWith(root + path.sep)) return void res.writeHead(403).end(); // niente uscite dalla cartella
    fs.readFile(file, (err, data) => {
      if (err) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(port, '127.0.0.1');
