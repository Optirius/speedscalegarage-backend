import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const defaultSettings: Record<string, string> = {
  shipping_dhaka: '60',
  shipping_outside_dhaka: '120',
  free_shipping_threshold: '15000',
  variant_label: 'Variant / Scale',
  variant_types: '1:18, 1:24, 1:32, 1:43, 1:64, Standard, Accessory',
  announcement_text: '⚡ Free Express Delivery on all Scale Model orders over ৳15,000 | 100% Authentic Diecast Collector Garage',
  announcement_active: 'true',
  contact_phone: '+880 1700-000000',
  contact_whatsapp: '+8801700000000',
  contact_email: 'support@speedscalegarage.com',
  facebook_page_url: 'https://facebook.com/speedscalegarage',
  instagram_url: 'https://instagram.com/speedscalegarage'
};

export async function settingRoutes(app: FastifyInstance) {
  // 1. Public: Get all store configuration settings
  app.get('/', async (_request, reply) => {
    const settings = await prisma.storeSetting.findMany();
    const configMap: Record<string, string> = { ...defaultSettings };

    for (const item of settings) {
      configMap[item.key] = item.value;
    }

    return reply.send(configMap);
  });

  // 2. Admin: Update settings in bulk or individually
  const updateSettingsSchema = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]));

  app.put('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = updateSettingsSchema.parse(request.body);

    for (const [key, value] of Object.entries(body)) {
      const stringVal = value === null || value === undefined ? '' : String(value);
      await prisma.storeSetting.upsert({
        where: { key },
        update: { value: stringVal },
        create: { key, value: stringVal }
      });
    }

    const updated = await prisma.storeSetting.findMany();
    const configMap: Record<string, string> = { ...defaultSettings };
    for (const item of updated) {
      configMap[item.key] = item.value;
    }

    return reply.send({
      success: true,
      settings: configMap
    });
  });
}
