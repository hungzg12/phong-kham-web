import { defineConfig } from 'vite';
import { createApiMiddleware } from './server/api-router.mjs';

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [{
    name: 'medicare-sql-backend',
    configureServer(server) {
      server.middlewares.use(createApiMiddleware());
    },
  }],
});
