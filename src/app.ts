import fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';

// Route imports
import { authRoutes } from './routes/auth.routes.js';
import { productRoutes } from './routes/product.routes.js';
import { categoryRoutes } from './routes/category.routes.js';
import { cartRoutes } from './routes/cart.routes.js';
import { orderRoutes } from './routes/order.routes.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { facebookRoutes } from './routes/facebook.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV === 'development'
  });

  // 1. CORS
  await app.register(cors, {
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  });

  // 2. JWT Plugin
  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  // 3. Multipart Uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });

  // 4. Static Uploads Serving
  await app.register(fastifyStatic, {
    root: path.resolve(env.UPLOAD_DIR),
    prefix: '/uploads/'
  });

  // 5. Swagger Documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'SpeedScale Garage E-Commerce API',
        description: 'High-performance diecast scale model e-commerce API with PostgreSQL & Facebook integrations',
        version: '1.0.0'
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs'
  });

  // 6. Health Check
  app.get('/health', async () => ({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'speedscale-api'
  }));

  // 7. API Routes Registration
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(productRoutes, { prefix: '/api/v1/products' });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(cartRoutes, { prefix: '/api/v1/cart' });
  await app.register(orderRoutes, { prefix: '/api/v1/orders' });
  await app.register(uploadRoutes, { prefix: '/api/v1/uploads' });
  await app.register(facebookRoutes, { prefix: '/api/v1/facebook' });

  // 8. Error Handler
  app.setErrorHandler((error: FastifyError | Error | any, _request, reply) => {
    app.log.error(error);
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: error.issues?.[0]?.message || 'Invalid input data',
        details: error.issues
      });
    }

    // Handle Database Connection Errors gracefully
    if (
      error.code === 'P1001' || 
      (typeof error.message === 'string' && error.message.includes("Can't reach database server"))
    ) {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Database server is unreachable. Please ensure PostgreSQL is running (e.g. docker compose up -d).'
      });
    }

    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    return reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred.'
    });
  });

  return app;
}
