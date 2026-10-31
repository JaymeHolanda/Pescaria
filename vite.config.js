import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { handleMpBackendRoutes } from './backend-hostinger/local-server.js';
import { handleS3BackendRoutes } from './backend-hostinger/s3-uploader.js';

export default {
  plugins: [
    {
      name: 'admin-route-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = (req.url || '').split('?')[0];
          if (urlPath === '/admin' || urlPath === '/admin/') {
            const adminFile = resolve('dist/admin.html');
            if (existsSync(adminFile)) {
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(readFileSync(adminFile, 'utf8'));
              return;
            }
          }
          if (urlPath.startsWith('/api/mp/')) {
            const handled = handleMpBackendRoutes(req, res);
            if (handled) return;
          }
          if (urlPath.startsWith('/api/s3/')) {
            const handled = handleS3BackendRoutes(req, res);
            if (handled) return;
          }
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api/tabuamare': {
        target: 'https://tabuamare.api.br',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/tabuamare/, '/api/v2'),
        configure: proxy => {
          proxy.on('proxyReq', proxyReq => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
            proxyReq.setHeader('Accept-Language', 'pt-BR,pt;q=0.9');
          });
        }
      }
    }
  }
};
