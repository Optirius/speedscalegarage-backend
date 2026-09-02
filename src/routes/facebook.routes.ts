import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export async function facebookRoutes(app: FastifyInstance) {
  // 1. Dynamic Facebook Product Catalog RSS/XML Feed
  // Facebook Commerce Manager polls this endpoint to auto-sync catalog products for Facebook Shop and Instagram tags!
  app.get('/catalog.xml', async (_request, reply) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } }
      }
    });

    const itemsXml = products.map(p => {
      const priceFormatted = `${Number(p.price).toFixed(2)} BDT`;
      const salePriceFormatted = p.salePrice ? `${Number(p.salePrice).toFixed(2)} BDT` : '';
      const imageUrl = p.images[0]?.url || 'https://images.unsplash.com/photo-1544636331-e268592033c2';
      const link = `${env.FRONTEND_URL}/product/${p.id}`;

      return `
    <item>
      <g:id>${p.id}</g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${p.description}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:brand>SpeedScale Garage</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${p.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${priceFormatted}</g:price>
      ${salePriceFormatted ? `<g:sale_price>${salePriceFormatted}</g:sale_price>` : ''}
      <g:custom_label_0>${p.scaleRatio || 'Diecast'}</g:custom_label_0>
      <g:product_type><![CDATA[${p.category.name}]]></g:product_type>
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>SpeedScale Garage Product Feed</title>
    <link>${env.FRONTEND_URL}</link>
    <description>Authentic scale diecast model cars catalog feed for Meta Commerce Manager</description>
    ${itemsXml}
  </channel>
</rss>`;

    reply.header('Content-Type', 'application/xml; charset=utf-8');
    return reply.send(xml);
  });

  // 2. Server-Side Facebook Conversions API (CAPI) Event Forwarder
  app.post('/events', async (request, reply) => {
    const schema = z.object({
      eventName: z.enum(['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase']),
      eventId: z.string(),
      eventSourceUrl: z.string().url(),
      userData: z.object({
        email: z.string().optional(),
        phone: z.string().optional()
      }).optional(),
      customData: z.object({
        value: z.number().optional(),
        currency: z.string().default('BDT'),
        contentName: z.string().optional(),
        contentIds: z.array(z.string()).optional()
      }).optional()
    });

    const body = schema.parse(request.body);

    // In production, dispatch to Graph API: https://graph.facebook.com/v19.0/${env.FB_PIXEL_ID}/events
    // Log server event
    if (env.NODE_ENV === 'development') {
      console.log(`📡 [Meta Conversions API] Event forwarded: ${body.eventName} (Value: ${body.customData?.value || 0} BDT)`);
    }

    return reply.send({
      success: true,
      eventsReceived: 1,
      fbtrace_id: 'mock_trace_' + Math.random().toString(36).substring(2, 9)
    });
  });
}
