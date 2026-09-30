/* Simulador de GitHub Pages: sirve dist/ dentro de un subdirectorio
   (/archforge/) para reproducir exactamente el entorno de Pages. */
const http = require('http')
const fs = require('fs')
const path = require('path')

const DIST = path.join(__dirname, '..', 'dist')
const MOUNT = '/archforge'
const PORT = 8080

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0])

    // Redirige la raiz del sitio al montaje, como hace Pages
    if (urlPath === '/' || urlPath === MOUNT) {
      res.writeHead(302, { Location: MOUNT + '/' })
      return res.end()
    }
    if (!urlPath.startsWith(MOUNT)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      return res.end('404 — fuera del sitio')
    }

    let rel = urlPath.slice(MOUNT.length) || '/'
    let file = path.join(DIST, rel)

    // Path traversal guard
    if (!file.startsWith(DIST)) {
      res.writeHead(403)
      return res.end('403')
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, 'index.html')
    }

    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, () => console.log(`Sirviendo dist/ en http://127.0.0.1:${PORT}${MOUNT}/`))