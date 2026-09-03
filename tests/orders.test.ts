import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';

describe('📦 Order & Checkout Pipeline Tests', () => {
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

    // Get a product ID for ordering
    const listRes = await app.inject({ method: 'GET', url: '/api/v1/products' });
    productId = JSON.parse(listRes.body).products[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/orders/checkout - Should place a Cash on Delivery order with Dhaka shipping and coupon discount', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      payload: {
        customerName: 'Ashiqur Rahman',
        customerEmail: 'ashiq@speedscalegarage.com',
        customerPhone: '01711223344',
        deliveryArea: 'INSIDE_DHAKA',
        shippingAddress: 'House 15, Road 7, Dhanmondi',
        city: 'Dhaka',
        notes: 'Handle with care fragile package',
        couponCode: 'SPEED10',
        items: [
          {
            productId,
            quantity: 1
          }
        ]
      }
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.orderNumber).toMatch(/^SSG-ORD-\d+$/);
    expect(body.paymentMethod).toBe('COD');
    expect(body.status).toBe('PENDING');
    expect(Number(body.shippingFee)).toBeGreaterThanOrEqual(0);
    expect(Number(body.discountAmount)).toBeGreaterThan(0);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBe(1);
  });

  it('GET /api/v1/orders/admin/stats - Should calculate revenue and KPI summary for admin dashboard', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/admin/stats',
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    const stats = JSON.parse(response.body);
    expect(stats).toHaveProperty('totalRevenue');
    expect(stats).toHaveProperty('totalOrders');
    expect(stats.totalOrders).toBeGreaterThan(0);
    expect(stats).toHaveProperty('pendingCount');
  });

  it('PATCH /api/v1/orders/admin/:id/status - Should transition order status across pipeline', async () => {
    // List orders to get order ID
    const ordersRes = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/admin',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const order = JSON.parse(ordersRes.body).orders[0];

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orders/admin/${order.id}/status`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        status: 'SHIPPED',
        adminNotes: 'Handed over to Steadfast Courier tracking #ST9988'
      }
    });

    expect(patchRes.statusCode).toBe(200);
    const updated = JSON.parse(patchRes.body);
    expect(updated.status).toBe('SHIPPED');
    expect(updated.adminNotes).toContain('Steadfast');
  });
});
