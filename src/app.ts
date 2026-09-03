import fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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
import { reviewRoutes } from './routes/review.routes.js';
import { bannerRoutes } from './routes/banner.routes.js';
import { settingRoutes } from './routes/setting.routes.js';
import { couponRoutes } from './routes/coupon.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV === 'development',
    trustProxy: true
  });

  // 1. HTTP Security Headers (Helmet)
  await app.register(helmet, {
    contentSecurityPolicy: false, // Allows flexible asset loading while keeping X-Frame, X-Content-Type, X-XSS protection
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });

  // 2. Rate Limiting (DDoS & Brute Force Mitigation)
  await app.register(rateLimit, {
    max: 120, // 120 requests per minute globally per IP
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait a moment before trying again.'
    })
  });

  // 3. CORS
  await app.register(cors, {
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // 4. JWT Plugin
  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  // 5. Multipart Uploads with file size boundary
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });

  // 6. Static Uploads Serving
  await app.register(fastifyStatic, {
    root: path.resolve(env.UPLOAD_DIR),
    prefix: '/uploads/'
  });

  // 7. Swagger Documentation
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

  // 8. Health Check
  app.get('/health', async () => ({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'speedscale-api'
  }));

  // 9. API Routes Registration
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(productRoutes, { prefix: '/api/v1/products' });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(cartRoutes, { prefix: '/api/v1/cart' });
  await app.register(orderRoutes, { prefix: '/api/v1/orders' });
  await app.register(uploadRoutes, { prefix: '/api/v1/uploads' });
  await app.register(facebookRoutes, { prefix: '/api/v1/facebook' });
  await app.register(reviewRoutes, { prefix: '/api/v1/reviews' });
  await app.register(bannerRoutes, { prefix: '/api/v1/banners' });
  await app.register(settingRoutes, { prefix: '/api/v1/settings' });
  await app.register(couponRoutes, { prefix: '/api/v1/coupons' });

  // 10. Robust Error Handler (Shielding Database and System Details)
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

    // Handle Database Connection Errors gracefully without stack exposure
    if (
      error.code === 'P1001' || 
      (typeof error.message === 'string' && error.message.includes("Can't reach database server"))
    ) {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Database server is unreachable. Please verify database connection.'
      });
    }

    const statusCode = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
    
    // In production, redact generic 500 server errors
    const message = (statusCode === 500 && env.NODE_ENV === 'production')
      ? 'An unexpected error occurred. Please try again later.'
      : (error.message || 'An unexpected error occurred.');

    return reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message
    });
  });

  return app;
}
