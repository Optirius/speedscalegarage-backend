import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('💳 Dual Payment System & Order Notification Tests (COD & bKash)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let productId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Create Admin for testing
    const passwordHash = await bcrypt.hash('pay_admin_123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'pay_admin@speedscalegarage.com' },
      update: { role: 'ADMIN' },
      create: {
        email: 'pay_admin@speedscalegarage.com',
        name: 'Payment Admin',
        passwordHash,
        role: 'ADMIN',
        authProvider: 'LOCAL'
      }
    });
    adminToken = app.jwt.sign({ userId: admin.id, email: admin.email, role: 'ADMIN' });

    // 2. Ensure a test category and product exist
    const category = await prisma.category.upsert({
      where: { slug: 'test-pay-cat' },
      update: {},
      create: {
        id: 'test-pay-cat',
        name: 'Test Pay Category',
        slug: 'test-pay-cat',
        image: 'https://test.jpg'
      }
    });

    const product = await prisma.product.upsert({
      where: { sku: 'TEST-PAY-001' },
      update: { stock: 50, price: 5000, isActive: true },
      create: {
        name: '1:18 Test Scale Model for Payments',
        slug: '1-18-test-model-payments',
        price: 5000,
        stock: 50,
        sku: 'TEST-PAY-001',
        scaleRatio: '1:18',
        categoryId: category.id,
        description: 'Test product description',
        isActive: true,
        images: {
          create: [{ url: 'https://test.jpg', isPrimary: true, displayOrder: 0 }]
        }
      }
    });
    productId = product.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Should successfully place a Cash on Delivery (COD) order', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      payload: {
        customerName: 'Ashikur Rahman',
        customerEmail: 'ashik@example.com',
        customerPhone: '01711223344',
        deliveryArea: 'INSIDE_DHAKA',
        shippingAddress: 'House 12, Road 4, Banani',
        city: 'Dhaka',
        paymentMethod: 'COD',
        items: [{ productId, quantity: 1 }]
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.orderNumber).toMatch(/^SSG-ORD-\d+$/);
    expect(body.paymentMethod).toBe('COD');
    expect(body.paymentStatus).toBe('PENDING');
    expect(body.paymentTrxId).toBeNull();
  });

  it('2. Should reject bKash order if sender number or TrxID is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      payload: {
        customerName: 'bKash Buyer',
        customerEmail: 'buyer@example.com',
        customerPhone: '01811223344',
        deliveryArea: 'INSIDE_DHAKA',
        shippingAddress: 'Gulshan 2',
        city: 'Dhaka',
        paymentMethod: 'BKASH',
        items: [{ productId, quantity: 1 }]
      }
    });

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res.payload);
    expect(data.error).toBe('Validation Error');
  });

  it('3. Should place a bKash Send Money order with valid TrxID and Sender Number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      payload: {
        customerName: 'bKash Verified Buyer',
        customerEmail: 'bkashbuyer@example.com',
        customerPhone: '01811223344',
        deliveryArea: 'OUTSIDE_DHAKA',
        shippingAddress: 'GEC Circle',
        city: 'Chattogram',
        paymentMethod: 'BKASH',
        paymentSenderNumber: '01811223344',
        paymentTrxId: 'BK928KL19X',
        items: [{ productId, quantity: 1 }]
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.paymentMethod).toBe('BKASH');
    expect(body.paymentStatus).toBe('PENDING');
    expect(body.paymentSenderNumber).toBe('01811223344');
    expect(body.paymentTrxId).toBe('BK928KL19X');
  });

  it('4. Should allow Admin to verify and mark bKash payment as PAID', async () => {
    // Create an order first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders/checkout',
      payload: {
        customerName: 'Verify Test',
        customerEmail: 'verify@example.com',
        customerPhone: '01911223344',
        deliveryArea: 'INSIDE_DHAKA',
        shippingAddress: 'Dhanmondi',
        city: 'Dhaka',
        paymentMethod: 'BKASH',
        paymentSenderNumber: '01911223344',
        paymentTrxId: 'TRX998877AA',
        items: [{ productId, quantity: 1 }]
      }
    });
    const order = JSON.parse(createRes.payload);

    // Admin verifies payment
    const verifyRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orders/admin/${order.id}/payment`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        paymentStatus: 'PAID',
        adminNotes: 'TrxID verified in bKash merchant statement'
      }
    });

    expect(verifyRes.statusCode).toBe(200);
    const updated = JSON.parse(verifyRes.payload);
    expect(updated.paymentStatus).toBe('PAID');
    expect(updated.status).toBe('CONFIRMED');
  });

  it('5. Should allow Admin to update bKash number and notification email settings', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings/admin',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        admin_notification_email: 'orders_dispatch@speedscalegarage.com',
        bkash_number: '01799887766',
        bkash_account_type: 'Merchant',
        bkash_enabled: 'true'
      }
    });

    expect(res.statusCode).toBe(200);

    const checkRes = await app.inject({
      method: 'GET',
      url: '/api/v1/settings'
    });
    const settings = JSON.parse(checkRes.payload);
    expect(settings.bkash_number).toBe('01799887766');
    expect(settings.bkash_account_type).toBe('Merchant');
  });
});
