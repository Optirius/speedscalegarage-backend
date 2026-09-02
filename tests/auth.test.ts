import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('🔐 Auth Module Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/admin/login - Should successfully authenticate seeded admin', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin/login',
      payload: {
        email: 'admin@speedscalegarage.com',
        password: 'speedscale123'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('token');
    expect(body.user.role).toBe('ADMIN');
    expect(body.user.email).toBe('admin@speedscalegarage.com');
  });

  it('POST /api/v1/auth/admin/login - Should reject invalid password with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/admin/login',
      payload: {
        email: 'admin@speedscalegarage.com',
        password: 'wrong_password'
      }
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Invalid admin credentials');
  });

  it('POST /api/v1/auth/register - Should register a new customer', async () => {
    const testEmail = `collector_${Date.now()}@speedscalegarage.com`;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: 'password123',
        name: 'Test Collector',
        phone: '01799887766'
      }
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('token');
    expect(body.user.email).toBe(testEmail);
    expect(body.user.role).toBe('CUSTOMER');
  });

  it('GET /api/v1/auth/me - Should reject unauthorized requests without token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me'
    });

    expect(response.statusCode).toBe(401);
  });
});
