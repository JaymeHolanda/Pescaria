export default {
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
