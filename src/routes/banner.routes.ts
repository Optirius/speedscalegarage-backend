import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

export async function bannerRoutes(app: FastifyInstance) {
  // 1. Public: Get active hero slides and promotional banners
  app.get('/', async (_request, reply) => {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });
    return reply.send(banners);
  });

  // 2. Admin: Get all banners (including inactive)
  app.get('/admin', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const banners = await prisma.banner.findMany({
      orderBy: { displayOrder: 'asc' }
    });
    return reply.send(banners);
  });

  // 3. Admin: Create a new banner
  const bannerSchema = z.object({
    title: z.string().min(2),
    subtitle: z.string().optional(),
    badgeText: z.string().optional(),
    image: z.string().url(),
    link: z.string().optional(),
    displayOrder: z.number().int().default(0),
    isActive: z.boolean().default(true)
  });

  app.post('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = bannerSchema.parse(request.body);
    const banner = await prisma.banner.create({
      data: body
    });
    return reply.status(201).send(banner);
  });

  // 4. Admin: Update banner
  app.put('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = bannerSchema.partial().parse(request.body);

    const banner = await prisma.banner.update({
      where: { id },
      data: body
    });
    return reply.send(banner);
  });

  // 5. Admin: Delete banner
  app.delete('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.banner.delete({
      where: { id }
    });
    return reply.send({ success: true, message: 'Banner deleted successfully' });
  });
}
