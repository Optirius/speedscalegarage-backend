import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';

describe('🔗 Facebook Integrations Module Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/facebook/catalog.xml - Should generate compliant XML product catalog feed', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/facebook/catalog.xml'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.body).toContain('<rss xmlns:g="http://base.google.com/ns/1.0"');
    expect(response.body).toContain('<g:brand>SpeedScale Garage</g:brand>');
    expect(response.body).toContain('<g:price>');
  });

  it('POST /api/v1/facebook/events - Should forward server-side Conversions API (CAPI) events', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/facebook/events',
      payload: {
        eventName: 'Purchase',
        eventId: 'evt_' + Date.now(),
        eventSourceUrl: 'http://localhost:5173/checkout/success',
        customData: {
          value: 7990,
          currency: 'BDT',
          contentName: '1:18 Ford Mustang GTA'
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.eventsReceived).toBe(1);
  });
});
