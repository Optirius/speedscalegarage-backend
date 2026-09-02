import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function cartRoutes(app: FastifyInstance) {
  // Get Authenticated User Cart
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const items = await prisma.cartItem.findMany({
      where: { userId: request.user!.userId },
      include: {
        product: {
          include: { images: true }
        }
      }
    });

    return reply.send(
      items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        price: Number(item.product.price),
        salePrice: item.product.salePrice ? Number(item.product.salePrice) : undefined,
        scaleRatio: item.product.scaleRatio,
        stock: item.product.stock,
        image: item.product.images[0]?.url || '',
        quantity: item.quantity
      }))
    );
  });

  // Add Item to Cart
  app.post('/add', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      productId: z.string(),
      quantity: z.number().int().positive().default(1)
    });

    const { productId, quantity } = schema.parse(request.body);
    const userId = request.user!.userId;

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } }
    });

    let cartItem;
    if (existing) {
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity }
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: { userId, productId, quantity }
      });
    }

    return reply.send(cartItem);
  });

  // Merge Guest Cart into User Cart upon login
  app.post('/merge', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive()
      }))
    });

    const { items } = schema.parse(request.body);
    const userId = request.user!.userId;

    for (const item of items) {
      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId, productId: item.productId } }
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.max(existing.quantity, item.quantity) }
        });
      } else {
        await prisma.cartItem.create({
          data: { userId, productId: item.productId, quantity: item.quantity }
        });
      }
    }

    return reply.send({ success: true, message: 'Cart synchronized successfully.' });
  });

  // Remove Item
  app.delete('/:productId', { preHandler: [authenticate] }, async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const userId = request.user!.userId;

    await prisma.cartItem.deleteMany({
      where: { userId, productId }
    });

    return reply.send({ success: true });
  });
}
