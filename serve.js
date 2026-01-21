import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';

const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.csv': 'text/csv',
};

createServer((req, res) => {
  let file = req.url === '/' ? '/chart.html' : req.url;
  const path = '.' + file;
  const ext = file.substring(file.lastIndexOf('.'));

  if (existsSync(path)) {
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(readFileSync(path));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Chart at http://localhost:${PORT}`);
});
