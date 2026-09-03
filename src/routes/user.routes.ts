import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

export async function userRoutes(app: FastifyInstance) {
  // All user management endpoints require active Administrator privileges
  app.addHook('preHandler', requireAdmin);

  // 1. Admin: Get paginated customer directory with KPI statistics
  app.get('/admin', async (request, reply) => {
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
      q: z.string().optional(),
      role: z.enum(['ALL', 'ADMIN', 'CUSTOMER']).default('ALL'),
      status: z.enum(['ALL', 'ACTIVE', 'DISABLED']).default('ALL')
    });

    const { page, limit, q, role, status } = querySchema.parse(request.query);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (q && q.trim()) {
      const search = q.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role !== 'ALL') {
      where.role = role;
    }

    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'DISABLED') {
      where.isActive = false;
    }

    // Run parallel queries for user records, counts, and KPI metrics
    const [rawUsers, totalCount, totalUsers, activeAdmins, disabledUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          authProvider: true,
          createdAt: true,
          updatedAt: true,
          cartItems: {
            select: {
              quantity: true,
              product: {
                select: {
                  price: true,
                  salePrice: true
                }
              }
            }
          },
          orders: {
            where: { status: { not: 'CANCELLED' } },
            select: {
              totalAmount: true
            }
          }
        }
      }),
      prisma.user.count({ where }),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN', isActive: true } }),
      prisma.user.count({ where: { isActive: false } })
    ]);

    // Format user summaries with cart items count, cart value, and lifetime spend
    let usersWithActiveCartsCount = 0;

    const users = rawUsers.map(user => {
      const cartItemCount = user.cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
      const cartTotalValue = user.cartItems.reduce((acc: number, item: any) => {
        const price = Number(item.product?.salePrice || item.product?.price || 0);
        return acc + (price * item.quantity);
      }, 0);

      if (cartItemCount > 0) {
        usersWithActiveCartsCount++;
      }

      const orderCount = user.orders.length;
      const totalSpent = user.orders.reduce((acc: number, order: any) => acc + Number(order.totalAmount || 0), 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        cartItemCount,
        cartTotalValue,
        orderCount,
        totalSpent
      };
    });

    return reply.send({
      users,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      stats: {
        totalUsers,
        activeAdmins,
        activeCarts: usersWithActiveCartsCount,
        disabledUsers
      }
    });
  });

  // 2. Admin: Get Customer 360 Deep Profile (Live Cart Items, Orders, Addresses, Reviews)
  app.get('/admin/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                salePrice: true,
                scaleRatio: true,
                images: { select: { url: true }, take: 1 },
                stock: true,
                isActive: true
              }
            }
          }
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true
          }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                images: { select: { url: true }, take: 1 }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return reply.status(404).send({ error: 'User account not found.' });
    }

    // Format real-time cart items
    const formattedCartItems = user.cartItems.map((item: any) => {
      const primaryImage = item.product?.images?.[0]?.url || '';
      const unitPrice = Number(item.product?.salePrice || item.product?.price || 0);
      const lineTotal = unitPrice * item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || 'Product',
        productSlug: item.product?.slug || '',
        scaleRatio: item.product?.scaleRatio || null,
        image: primaryImage,
        stock: item.product?.stock || 0,
        isProductActive: item.product?.isActive ?? true,
        unitPrice,
        quantity: item.quantity,
        lineTotal
      };
    });

    const cartTotalAmount = formattedCartItems.reduce((acc: number, item: any) => acc + item.lineTotal, 0);

    // Format order history
    const formattedOrders = user.orders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      totalAmount: Number(order.totalAmount),
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      discountAmount: Number(order.discountAmount || 0),
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentSenderNumber: order.paymentSenderNumber,
      paymentTrxId: order.paymentTrxId,
      itemsCount: order.items.length
    }));

    const lifetimeSpend = formattedOrders
      .filter((o: any) => o.status !== 'CANCELLED')
      .reduce((acc: number, o: any) => acc + o.totalAmount, 0);

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lifetimeSpend,
        ordersCount: formattedOrders.length
      },
      cart: {
        itemsCount: formattedCartItems.reduce((acc: number, item: any) => acc + item.quantity, 0),
        totalAmount: cartTotalAmount,
        items: formattedCartItems
      },
      orders: formattedOrders,
      addresses: user.addresses,
      reviews: user.reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isApproved: r.isApproved,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt,
        product: r.product ? {
          id: r.product.id,
          name: r.product.name,
          sku: r.product.sku,
          image: r.product.images?.[0]?.url || ''
        } : null
      }))
    });
  });

  // 3. Admin: Toggle User Active Status (Enable / Disable)
  app.patch('/admin/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      isActive: z.boolean()
    });

    const { isActive } = schema.parse(request.body);

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return reply.status(404).send({ error: 'User account not found.' });
    }

    // Safety Guardrail: Prevent admin self-disabling
    if (request.user!.userId === targetUser.id && !isActive) {
      return reply.status(400).send({
        error: 'Security Guardrail: You cannot disable your own administrative account.'
      });
    }

    // Safety Guardrail: Prevent disabling the sole remaining active administrator
    if (targetUser.role === 'ADMIN' && !isActive) {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true }
      });
      if (activeAdminCount <= 1) {
        return reply.status(400).send({
          error: 'Security Guardrail: Cannot disable the last remaining active administrator.'
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    return reply.send({
      message: `User account has been ${isActive ? 'enabled' : 'disabled'} successfully.`,
      user: updated
    });
  });

  // 4. Admin: Change User Role (CUSTOMER <-> ADMIN)
  app.patch('/admin/:id/role', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      role: z.enum(['ADMIN', 'CUSTOMER'])
    });

    const { role } = schema.parse(request.body);

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return reply.status(404).send({ error: 'User account not found.' });
    }

    // Safety Guardrail: Prevent admin self-demotion
    if (request.user!.userId === targetUser.id && role !== 'ADMIN') {
      return reply.status(400).send({
        error: 'Security Guardrail: You cannot demote your own administrator privileges.'
      });
    }

    // Safety Guardrail: Prevent demoting the last remaining active administrator
    if (targetUser.role === 'ADMIN' && role === 'CUSTOMER') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true }
      });
      if (activeAdminCount <= 1) {
        return reply.status(400).send({
          error: 'Security Guardrail: Cannot demote the last remaining active administrator.'
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    return reply.send({
      message: `User role has been updated to ${role} successfully.`,
      user: updated
    });
  });

  // 5. Admin: Delete User Account
  app.delete('/admin/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return reply.status(404).send({ error: 'User account not found.' });
    }

    // Safety Guardrail: Cannot delete self
    if (request.user!.userId === targetUser.id) {
      return reply.status(400).send({
        error: 'Security Guardrail: You cannot delete your own administrator account.'
      });
    }

    // Safety Guardrail: Cannot delete last remaining active admin
    if (targetUser.role === 'ADMIN') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true }
      });
      if (activeAdminCount <= 1) {
        return reply.status(400).send({
          error: 'Security Guardrail: Cannot delete the last remaining active administrator.'
        });
      }
    }

    await prisma.user.delete({ where: { id } });

    return reply.send({
      message: `User "${targetUser.name}" (${targetUser.email}) and related records deleted successfully.`
    });
  });
}
