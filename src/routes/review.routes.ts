import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin, optionalAuth } from '../middlewares/auth.middleware.js';

export async function reviewRoutes(app: FastifyInstance) {
  // 1. Public: Get approved reviews for a specific product + aggregated stats
  app.get('/product/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string };

    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isApproved: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
      : 5.0;

    // Calculate rating distribution (1 to 5 stars)
    const breakdown = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    };

    return reply.send({
      averageRating,
      totalReviews,
      breakdown,
      reviews
    });
  });

  // 2. Customer: Submit a new review
  const createReviewSchema = z.object({
    productId: z.string().min(1),
    customerName: z.string().min(2),
    rating: z.number().int().min(1).max(5),
    title: z.string().optional(),
    comment: z.string().min(5),
    userEmail: z.string().email().optional()
  });

  app.post('/', { preHandler: [optionalAuth] }, async (request, reply) => {
    const body = createReviewSchema.parse(request.body);
    const userId = request.user?.userId;

    // Check if customer is a verified buyer (ordered this product in DELIVERED or CONFIRMED state)
    let isVerifiedPurchase = false;
    if (userId || body.userEmail) {
      try {
        const pastOrder = await prisma.order.findFirst({
          where: {
            OR: [
              userId ? { userId } : {},
              body.userEmail ? { customerEmail: body.userEmail } : {}
            ],
            items: {
              some: { productId: body.productId }
            },
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
          }
        });
        if (pastOrder) isVerifiedPurchase = true;
      } catch (e) {
        // Safe fallback for in-memory or query adapter limitations
      }
    }

    const review = await prisma.review.create({
      data: {
        productId: body.productId,
        userId: userId || null,
        customerName: body.customerName,
        rating: body.rating,
        title: body.title,
        comment: body.comment,
        isVerifiedPurchase,
        isApproved: true // Auto-approved by default, can be moderated in admin
      }
    });

    return reply.status(201).send(review);
  });

  // 3. Admin: List all reviews (with filter)
  app.get('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { status, productId } = request.query as { status?: string; productId?: string };

    const where: any = {};
    if (status === 'approved') where.isApproved = true;
    if (status === 'pending') where.isApproved = false;
    if (productId) where.productId = productId;

    const reviews = await prisma.review.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true, scaleRatio: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({ reviews });
  });

  // 4. Admin: Update review approval status
  app.patch('/admin/:id/status', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isApproved } = z.object({ isApproved: z.boolean() }).parse(request.body);

    const review = await prisma.review.update({
      where: { id },
      data: { isApproved }
    });

    return reply.send(review);
  });

  // 5. Admin: Delete review
  app.delete('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.review.delete({
      where: { id }
    });

    return reply.send({ success: true, message: 'Review deleted successfully' });
  });
}
