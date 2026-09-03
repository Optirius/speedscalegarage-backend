import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

export async function couponRoutes(app: FastifyInstance) {
  // 1. Public: Validate a coupon code against an order subtotal
  const validateCouponSchema = z.object({
    code: z.string().min(2),
    subtotal: z.number().nonnegative()
  });

  app.post('/validate', async (request, reply) => {
    const { code, subtotal } = validateCouponSchema.parse(request.body);

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon || !coupon.isActive) {
      return reply.status(400).send({
        valid: false,
        message: 'Invalid or inactive promo code.'
      });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return reply.status(400).send({
        valid: false,
        message: 'This promo code has expired.'
      });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return reply.status(400).send({
        valid: false,
        message: 'This promo code has reached its maximum usage limit.'
      });
    }

    const minOrder = Number(coupon.minOrderValue);
    if (subtotal < minOrder) {
      return reply.status(400).send({
        valid: false,
        message: `Minimum order amount of ৳${minOrder.toLocaleString()} is required to apply code ${coupon.code}.`
      });
    }

    const discountAmount = (subtotal * coupon.discountPercent) / 100;

    return reply.send({
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount,
      message: `${coupon.discountPercent}% discount applied successfully!`
    });
  });

  // 2. Admin: List all coupons
  app.get('/admin', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return reply.send(coupons);
  });

  // 3. Admin: Create coupon
  const createCouponSchema = z.object({
    code: z.string().min(2).transform(c => c.toUpperCase()),
    discountPercent: z.number().int().min(1).max(100),
    minOrderValue: z.number().nonnegative().default(0),
    maxUses: z.number().int().positive().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    isActive: z.boolean().default(true)
  });

  app.post('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = createCouponSchema.parse(request.body);

    const existing = await prisma.coupon.findUnique({
      where: { code: body.code }
    });
    if (existing) {
      return reply.status(400).send({ error: 'Coupon code already exists.' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: body.code,
        discountPercent: body.discountPercent,
        minOrderValue: body.minOrderValue,
        maxUses: body.maxUses || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive
      }
    });

    return reply.status(201).send(coupon);
  });

  // 4. Admin: Update coupon
  app.put('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createCouponSchema.partial().parse(request.body);

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...body,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined
      }
    });

    return reply.send(coupon);
  });

  // 5. Admin: Delete coupon
  app.delete('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.coupon.delete({
      where: { id }
    });

    return reply.send({ success: true, message: 'Coupon deleted successfully' });
  });
}
