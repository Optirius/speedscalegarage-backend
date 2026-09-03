import type { IncomingMessage, ServerResponse } from 'http';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }

  app.server.emit('request', req, res);
}
