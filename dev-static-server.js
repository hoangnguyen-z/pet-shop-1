const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = process.env.PORT || 5500;
const apiPort = process.env.API_PORT || 3000;

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function proxyApiRequest(req, res) {
    const proxyRequest = http.request({
        hostname: '127.0.0.1',
        port: apiPort,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: `127.0.0.1:${apiPort}`
        }
    }, proxyResponse => {
        res.writeHead(proxyResponse.statusCode || 502, {
            ...proxyResponse.headers,
            'Cache-Control': 'no-store'
        });
        proxyResponse.pipe(res);
    });

    proxyRequest.on('error', error => {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: false,
            message: `API proxy error: ${error.message}`
        }));
    });

    req.pipe(proxyRequest);
}

http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    let urlPath = decodeURIComponent(parsedUrl.pathname);
    if (urlPath === '/api' || urlPath.startsWith('/api/')) {
        proxyApiRequest(req, res);
        return;
    }

    if (urlPath === '/') urlPath = '/index.html';

    let filePath = path.normalize(path.join(root, urlPath));
    if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (statError, stats) => {
        if (statError) {
            const hasExtension = Boolean(path.extname(filePath));
            if (!hasExtension) {
                const fallback = path.join(root, 'index.html');
                fs.readFile(fallback, (fallbackError, content) => {
                    if (fallbackError) {
                        res.writeHead(404);
                        res.end('Not found');
                        return;
                    }
                    res.writeHead(200, {
                        'Content-Type': mimeTypes['.html'],
                        'Cache-Control': 'no-store'
                    });
                    res.end(content);
                });
                return;
            }
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        if (stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        fs.readFile(filePath, (readError, content) => {
            if (readError) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            res.writeHead(200, {
                'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
                'Cache-Control': 'no-store'
            });
            res.end(content);
        });
    });
}).listen(port, () => {
    console.log(`Frontend running at http://localhost:${port}`);
});
