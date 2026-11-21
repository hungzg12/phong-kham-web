import { defineConfig } from 'vite';
import { createApiMiddleware } from './server/api-router.mjs';
import { createAdminMiddleware } from './server/admin-api.mjs';

export default defineConfig({
  build: { rollupOptions: { input: { site: 'index.html', admin: 'admin.html' } } },
  server: {
    port: 3000,
  },
  plugins: [{
    name: 'medicare-sql-backend',
    configureServer(server) {
      server.middlewares.use(createAdminMiddleware());
      server.middlewares.use(createApiMiddleware());
    },
  }],
});
