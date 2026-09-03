import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('🛡️ Comprehensive Security, Auth Guard & Access Control Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let customerToken: string;
  let customerId: string;
  let otherCustomerToken: string;
  let otherCustomerId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Create test admin
    const passwordHash = await bcrypt.hash('security_admin_123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'sec_admin@speedscalegarage.com' },
      update: { role: 'ADMIN' },
      create: {
        email: 'sec_admin@speedscalegarage.com',
        name: 'Sec Admin',
        passwordHash,
        role: 'ADMIN',
        authProvider: 'LOCAL'
      }
    });
    adminToken = app.jwt.sign({ userId: adminUser.id, email: adminUser.email, role: 'ADMIN' });

    // 2. Create customer 1
    const cust1 = await prisma.user.upsert({
      where: { email: 'sec_cust1@speedscalegarage.com' },
      update: { role: 'CUSTOMER' },
      create: {
        email: 'sec_cust1@speedscalegarage.com',
        name: 'Sec Customer 1',
        passwordHash,
        role: 'CUSTOMER',
        authProvider: 'LOCAL'
      }
    });
    customerId = cust1.id;
    customerToken = app.jwt.sign({ userId: cust1.id, email: cust1.email, role: 'CUSTOMER' });

    // 3. Create customer 2
    const cust2 = await prisma.user.upsert({
      where: { email: 'sec_cust2@speedscalegarage.com' },
      update: { role: 'CUSTOMER' },
      create: {
        email: 'sec_cust2@speedscalegarage.com',
        name: 'Sec Customer 2',
        passwordHash,
        role: 'CUSTOMER',
        authProvider: 'LOCAL'
      }
    });
    otherCustomerId = cust2.id;
    otherCustomerToken = app.jwt.sign({ userId: cust2.id, email: cust2.email, role: 'CUSTOMER' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Should return 401 Unauthorized when accessing admin routes without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/admin'
    });

    expect(res.statusCode).toBe(401);
    const data = JSON.parse(res.payload);
    expect(data.error).toContain('Unauthorized');
  });

  it('2. Should return 403 Forbidden when customer token attempts to access admin routes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/admin',
      headers: {
        authorization: `Bearer ${customerToken}`
      }
    });

    expect(res.statusCode).toBe(403);
    const data = JSON.parse(res.payload);
    expect(data.error).toContain('Forbidden');
  });

  it('3. Should return 403 Forbidden when a token has role ADMIN but user does not exist in DB', async () => {
    const forgedToken = app.jwt.sign({ userId: 'fake_non_existent_uuid', email: 'forged@hack.com', role: 'ADMIN' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/admin',
      headers: {
        authorization: `Bearer ${forgedToken}`
      }
    });

    expect(res.statusCode).toBe(403);
  });

  it('4. Should enforce IDOR protection on order retrieval: Customer cannot view another customer order', async () => {
    // Create an order for customer 1
    const product = await prisma.product.findFirst({ where: { isActive: true } });
    if (!product) return;

    const order = await prisma.order.create({
      data: {
        orderNumber: `SEC-ORD-${Date.now()}`,
        userId: customerId,
        customerName: 'Customer 1',
        customerEmail: 'sec_cust1@speedscalegarage.com',
        customerPhone: '01700000001',
        deliveryArea: 'INSIDE_DHAKA',
        shippingAddress: 'Banani',
        city: 'Dhaka',
        subtotal: 5000,
        shippingFee: 60,
        totalAmount: 5060,
        status: 'PENDING',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING'
      }
    });

    // Customer 2 attempts to view Customer 1's order
    const unauthorizedAttempt = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${order.id}`,
      headers: {
        authorization: `Bearer ${otherCustomerToken}`
      }
    });
    expect(unauthorizedAttempt.statusCode).toBe(403);

    // Customer 1 views own order -> 200 OK
    const authorizedAttempt = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${order.id}`,
      headers: {
        authorization: `Bearer ${customerToken}`
      }
    });

    expect(authorizedAttempt.statusCode).toBe(200);

    // Admin views order -> 200 OK
    const adminAttempt = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${order.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });

    expect(adminAttempt.statusCode).toBe(200);
  });

  it('5. Should include HTTP Security Headers from Helmet', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('6. Should reject password brute-force or invalid credentials with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin/login',
      payload: {
        email: 'sec_admin@speedscalegarage.com',
        password: 'wrong_password_attempt'
      }
    });

    expect(res.statusCode).toBe(401);
    const data = JSON.parse(res.payload);
    expect(data.error).toContain('Invalid admin credentials');
  });
});
