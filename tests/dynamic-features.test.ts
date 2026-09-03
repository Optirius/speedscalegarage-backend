import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';

describe('🌟 Dynamic Features (Reviews, Banners, Settings, Coupons) Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let productId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate admin
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin/login',
      payload: {
        email: 'admin@speedscalegarage.com',
        password: 'speedscale123'
      }
    });
    adminToken = JSON.parse(loginRes.body).token;

    // Get a product ID for reviews
    const listRes = await app.inject({ method: 'GET', url: '/api/v1/products' });
    productId = JSON.parse(listRes.body).products[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. Settings Module
  it('GET /api/v1/settings - Should return dynamic store settings', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/settings' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('shipping_dhaka');
    expect(body).toHaveProperty('announcement_text');
  });

  it('PUT /api/v1/settings/admin - Should update store settings as admin', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings/admin',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        shipping_dhaka: '70',
        announcement_text: '⚡ Updated Eid Special Free Shipping!'
      }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.settings.shipping_dhaka).toBe('70');
  });

  // 2. Banners Module
  it('GET /api/v1/banners - Should return active hero slides', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/banners' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('title');
    expect(body[0]).toHaveProperty('image');
  });

  // 3. Reviews Module
  it('POST /api/v1/reviews - Should submit a customer product review', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reviews',
      payload: {
        productId,
        customerName: 'Siam Collector',
        rating: 5,
        title: 'Outstanding quality model',
        comment: 'High grade metal body, smooth rolling rubber wheels. Very satisfied.'
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.rating).toBe(5);
    expect(body.customerName).toBe('Siam Collector');
  });

  it('GET /api/v1/reviews/product/:productId - Should compute average rating and rating breakdown', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/reviews/product/${productId}`
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('averageRating');
    expect(body).toHaveProperty('totalReviews');
    expect(body).toHaveProperty('breakdown');
    expect(body.breakdown).toHaveProperty('5');
    expect(body.totalReviews).toBeGreaterThan(0);
  });

  // 4. Coupons Module
  it('POST /api/v1/coupons/validate - Should validate promo code and calculate discount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/coupons/validate',
      payload: {
        code: 'SPEED10',
        subtotal: 10000
      }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.valid).toBe(true);
    expect(body.discountPercent).toBe(10);
    expect(body.discountAmount).toBe(1000);
  });
});
