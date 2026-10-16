import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import app from './src/server/index';

function apiServerPlugin(): Plugin {
  return {
    name: 'api-server-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          return next();
        }

        try {
          const url = `http://${req.headers.host || 'localhost:3000'}${req.url}`;
          const method = req.method || 'GET';

          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (v) {
              if (Array.isArray(v)) {
                v.forEach((val) => headers.append(k, val));
              } else {
                headers.set(k, v);
              }
            }
          }

          let body: any = undefined;
          if (method !== 'GET' && method !== 'HEAD') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            body = Buffer.concat(chunks);
          }

          const request = new Request(url, {
            method,
            headers,
            body,
          });

          const response = await app.fetch(request);

          res.statusCode = response.status;
          response.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });

          if (response.body) {
            const arrayBuffer = await response.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          } else {
            res.end();
          }
        } catch (err) {
          console.error('[API Dev Server Error]:', err);
          next();
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), apiServerPlugin()],
  server: {
    port: 3000,
    open: false,
  },
});
