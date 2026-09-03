import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

export async function categoryRoutes(app: FastifyInstance) {
  // Public: Get all categories with product count
  app.get('/', async (_request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } }
        }
      }
    });

    return reply.send(
      categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        description: c.description,
        itemCount: c._count.products
      }))
    );
  });

  // Admin: Create Category
  app.post('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().optional(),
      image: z.string().url(),
      description: z.string().optional(),
      displayOrder: z.number().default(0)
    });

    const body = schema.parse(request.body);
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        image: body.image,
        description: body.description,
        displayOrder: body.displayOrder
      }
    });

    return reply.status(201).send(category);
  });

  // Admin: Update Category
  app.put('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      slug: z.string().optional(),
      image: z.string().url().optional(),
      description: z.string().optional(),
      displayOrder: z.number().optional()
    });

    const body = schema.parse(request.body);
    const category = await prisma.category.update({
      where: { id },
      data: body
    });

    return reply.send(category);
  });

  // Admin: Delete Category
  app.delete('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const productCount = await prisma.product.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      return reply.status(400).send({
        error: `Cannot delete category because ${productCount} product(s) are currently assigned to it. Please reassign or delete them first.`
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    return reply.send({ success: true, message: 'Category removed successfully.' });
  });
}
