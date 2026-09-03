import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';

export async function orderRoutes(app: FastifyInstance) {
  // 1. Place Order (Cash on Delivery)
  app.post('/checkout', async (request, reply) => {
    const schema = z.object({
      customerName: z.string().min(2),
      customerEmail: z.string().email(),
      customerPhone: z.string().min(10),
      deliveryArea: z.enum(['INSIDE_DHAKA', 'OUTSIDE_DHAKA']),
      shippingAddress: z.string().min(5),
      city: z.string().min(2),
      notes: z.string().optional(),
      couponCode: z.string().optional(),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive()
      })).min(1)
    });

    const body = schema.parse(request.body);

    // Optional user from JWT if token is provided in headers
    let authUserId: string | undefined;
    try {
      const payload = await request.jwtVerify<{ userId: string }>();
      authUserId = payload.userId;
    } catch (e) {
      // Guest order
    }

    const order = await prisma.$transaction(async (tx) => {
      // 1. Fetch store settings for shipping rules
      const settings = await tx.storeSetting.findMany();
      const settingsMap = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, string>);

      const shippingDhaka = Number(settingsMap['shipping_dhaka'] || 60);
      const shippingOutside = Number(settingsMap['shipping_outside_dhaka'] || 120);
      const freeThreshold = Number(settingsMap['free_shipping_threshold'] || 15000);

      // 2. Fetch products & compute subtotal with inventory lock
      let subtotal = 0;
      const orderItemsData: any[] = [];

      for (const item of body.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          include: { images: true }
        });

        if (!prod || !prod.isActive) {
          throw new Error(`Product with ID ${item.productId} is not available.`);
        }

        if (prod.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock}`);
        }

        const unitPrice = prod.salePrice ? Number(prod.salePrice) : Number(prod.price);
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        orderItemsData.push({
          productId: prod.id,
          productName: prod.name,
          image: prod.images[0]?.url || '',
          unitPrice,
          quantity: item.quantity,
          totalPrice,
          scaleRatio: prod.scaleRatio
        });

        // Atomic inventory deduction
        await tx.product.update({
          where: { id: prod.id },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // 3. Shipping fee computation
      const shippingFee = subtotal >= freeThreshold ? 0 : (body.deliveryArea === 'INSIDE_DHAKA' ? shippingDhaka : shippingOutside);

      // 4. Secure Coupon Validation & Redemption
      let discountAmount = 0;
      if (body.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: body.couponCode.toUpperCase() } });
        if (coupon && coupon.isActive) {
          const now = new Date();
          const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
          const meetsMinSpend = !coupon.minOrderValue || subtotal >= Number(coupon.minOrderValue);
          const hasUsesLeft = coupon.maxUses === null || coupon.usedCount < coupon.maxUses;

          if (!isExpired && meetsMinSpend && hasUsesLeft) {
            discountAmount = Math.round(subtotal * (coupon.discountPercent / 100));
            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } }
            });
          }
        }
      }

      const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);
      const orderNumber = `SSG-ORD-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

      return tx.order.create({
        data: {
          orderNumber,
          userId: authUserId,
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          customerPhone: body.customerPhone,
          deliveryArea: body.deliveryArea,
          shippingAddress: body.shippingAddress,
          city: body.city,
          notes: body.notes,
          subtotal,
          shippingFee,
          discountAmount,
          totalAmount,
          status: 'PENDING',
          paymentMethod: 'COD',
          paymentStatus: 'PENDING',
          items: {
            create: orderItemsData
          }
        },
        include: { items: true }
      });
    });

    return reply.status(201).send(order);
  });

  // 2. Customer: Get My Orders
  app.get('/my-orders', { preHandler: [authenticate] }, async (request, reply) => {
    const orders = await prisma.order.findMany({
      where: { userId: request.user!.userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    return reply.send(orders);
  });

  // 3. Customer / Admin: Get Specific Order (Anti-IDOR Protection)
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found.' });
    }

    // IDOR Check: user must own order OR be an ADMIN
    if (order.userId !== user.userId && user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden. You cannot view this order.' });
    }

    return reply.send(order);
  });

  // 4. Admin: Get All Orders with Status Filter & Search
  app.get('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const schema = z.object({
      status: z.string().optional(),
      q: z.string().optional(),
      page: z.string().optional().transform(v => (v ? parseInt(v) : 1)),
      limit: z.string().optional().transform(v => (v ? parseInt(v) : 30))
    });

    const query = schema.parse(request.query);
    const where: any = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.q) {
      where.OR = [
        { orderNumber: { contains: query.q, mode: 'insensitive' } },
        { customerName: { contains: query.q, mode: 'insensitive' } },
        { customerPhone: { contains: query.q, mode: 'insensitive' } }
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.order.count({ where })
    ]);

    return reply.send({ orders, total, page: query.page });
  });

  // 5. Admin: Update Order Pipeline Status
  app.patch('/admin/:id/status', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
      adminNotes: z.string().optional()
    });

    const { status, adminNotes } = schema.parse(request.body);

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        paymentStatus: status === 'DELIVERED' ? 'PAID' : undefined,
        adminNotes
      },
      include: { items: true }
    });

    return reply.send(updated);
  });

  // 6. Admin: Dashboard Stats
  app.get('/admin/stats', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const [totalRevenueResult, totalOrders, pendingCount, shippedCount, deliveredCount, lowStockCount] = await Promise.all([
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: 'CANCELLED' } }
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.product.count({ where: { stock: { lte: 5 } } })
    ]);

    return reply.send({
      totalRevenue: Number(totalRevenueResult._sum.totalAmount || 0),
      totalOrders,
      pendingCount,
      shippedCount,
      deliveredCount,
      lowStockCount
    });
  });
}
