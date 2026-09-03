import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('User Management & Customer 360 API (/api/v1/users/admin)', () => {
  let app: any;
  let adminToken: string;
  let adminUser: any;
  let customerUser: any;
  let sampleProduct: any;

  beforeEach(async () => {
    app = await buildApp();

    // Fetch seed admin
    adminUser = await prisma.user.findUnique({
      where: { email: 'admin@speedscalegarage.com' }
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin/login',
      payload: {
        email: 'admin@speedscalegarage.com',
        password: 'speedscale123'
      }
    });
    adminToken = loginRes.json().token;

    // Create a fresh test customer
    const passHash = await bcrypt.hash('customer123', 10);
    customerUser = await prisma.user.create({
      data: {
        email: `test_collector_${Date.now()}@example.com`,
        name: 'Rahim Collector',
        phone: '01711223344',
        passwordHash: passHash,
        role: 'CUSTOMER',
        isActive: true,
        authProvider: 'LOCAL'
      }
    });

    // Find sample product and add to customer's cart
    sampleProduct = await prisma.product.findFirst();
    if (sampleProduct) {
      await prisma.cartItem.create({
        data: {
          userId: customerUser.id,
          productId: sampleProduct.id,
          quantity: 2
        }
      });
    }
  });

  it('1. should allow admin to fetch paginated user directory with KPI stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/admin',
      headers: { authorization: `Bearer ${adminToken}` }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.users).toBeDefined();
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.stats).toBeDefined();
    expect(body.stats.totalUsers).toBeGreaterThanOrEqual(2);
    expect(body.stats.activeAdmins).toBeGreaterThanOrEqual(1);

    const target = body.users.find((u: any) => u.id === customerUser.id);
    expect(target).toBeDefined();
    expect(target.cartItemCount).toBe(2);
    expect(target.cartTotalValue).toBeGreaterThan(0);
  });

  it('2. should filter users by search query and role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/admin?q=${encodeURIComponent(customerUser.email)}&role=CUSTOMER`,
      headers: { authorization: `Bearer ${adminToken}` }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.users.length).toBe(1);
    expect(body.users[0].id).toBe(customerUser.id);
  });

  it('3. should provide Customer 360 view with live cart items inspection', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/admin/${customerUser.id}`,
      headers: { authorization: `Bearer ${adminToken}` }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.id).toBe(customerUser.id);
    expect(body.cart).toBeDefined();
    expect(body.cart.itemsCount).toBe(2);
    expect(body.cart.items.length).toBe(1);
    expect(body.cart.items[0].productName).toBe(sampleProduct.name);
    expect(body.cart.items[0].quantity).toBe(2);
    expect(body.cart.totalAmount).toBeGreaterThan(0);
    expect(body.orders).toBeDefined();
    expect(body.addresses).toBeDefined();
    expect(body.reviews).toBeDefined();
  });

  it('4. should allow admin to disable customer and block login', async () => {
    // Disable user
    const disableRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/admin/${customerUser.id}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { isActive: false }
    });

    expect(disableRes.statusCode).toBe(200);
    expect(disableRes.json().user.isActive).toBe(false);

    // Attempt customer login - should be rejected with 403
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: customerUser.email,
        password: 'customer123'
      }
    });

    expect(loginRes.statusCode).toBe(403);
    expect(loginRes.json().error).toContain('suspended or disabled');

    // Re-enable user
    const enableRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/admin/${customerUser.id}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { isActive: true }
    });
    expect(enableRes.statusCode).toBe(200);
    expect(enableRes.json().user.isActive).toBe(true);
  });

  it('5. should allow admin to promote customer to admin and demote back', async () => {
    const promoteRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/admin/${customerUser.id}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'ADMIN' }
    });

    expect(promoteRes.statusCode).toBe(200);
    expect(promoteRes.json().user.role).toBe('ADMIN');

    const demoteRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/admin/${customerUser.id}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'CUSTOMER' }
    });

    expect(demoteRes.statusCode).toBe(200);
    expect(demoteRes.json().user.role).toBe('CUSTOMER');
  });

  it('6. should reject self-disabling and self-demotion via security guardrails', async () => {
    // Admin attempting to disable self
    const selfDisableRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/admin/${adminUser.id}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { isActive: false }
    });

    expect(selfDisableRes.statusCode).toBe(400);
    expect(selfDisableRes.json().error).toContain('cannot disable your own');

    // Admin attempting to demote self
    const selfDemoteRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/admin/${adminUser.id}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'CUSTOMER' }
    });

    expect(selfDemoteRes.statusCode).toBe(400);
    expect(selfDemoteRes.json().error).toContain('cannot demote your own');
  });
});
