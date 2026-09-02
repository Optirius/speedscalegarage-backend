import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';

describe('🚗 Products & Categories Module Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate admin to get token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin/login',
      payload: {
        email: 'admin@speedscalegarage.com',
        password: 'speedscale123'
      }
    });
    const loginBody = JSON.parse(loginRes.body);
    adminToken = loginBody.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/products - Should list all active products with pagination', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products?limit=10'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.totalCount).toBeGreaterThan(0);
  });

  it('GET /api/v1/products?scale=1:18 - Should filter products by 1:18 scale ratio', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products?scale=1:18'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    for (const prod of body.products) {
      expect(prod.scaleRatio).toBe('1:18');
    }
  });

  it('GET /api/v1/categories - Should list categories with live product count', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/categories'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('itemCount');
  });

  it('POST /api/v1/products/admin - Should allow admin to create a new product', async () => {
    const testSku = `SSG-TEST-${Date.now()}`;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products/admin',
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      payload: {
        name: '1:18 Nissan GT-R Nismo Test Edition',
        description: 'Exclusive track model with opening parts and rubber tires.',
        price: 9500,
        salePrice: 8500,
        stock: 5,
        sku: testSku,
        scaleRatio: '1:18',
        categoryId: 'modern-supercars',
        isFeatured: true,
        isActive: true,
        images: ['https://images.unsplash.com/photo-1544636331-e268592033c2']
      }
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.sku).toBe(testSku);
    expect(body.name).toBe('1:18 Nissan GT-R Nismo Test Edition');
  });

  it('PATCH /api/v1/products/admin/:id/stock - Should update inventory stock level', async () => {
    // List to get a product
    const listRes = await app.inject({ method: 'GET', url: '/api/v1/products' });
    const product = JSON.parse(listRes.body).products[0];

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/admin/${product.id}/stock`,
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      payload: {
        stock: 25
      }
    });

    expect(patchRes.statusCode).toBe(200);
    const body = JSON.parse(patchRes.body);
    expect(body.stock).toBe(25);
  });
});
