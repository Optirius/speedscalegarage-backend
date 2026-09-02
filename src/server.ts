import { buildApp } from './app.js';
import { env } from './config/env.js';

async function startServer() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 SpeedScale Backend running at http://localhost:${env.PORT}`);
    console.log(`📚 Swagger Docs available at http://localhost:${env.PORT}/api/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
