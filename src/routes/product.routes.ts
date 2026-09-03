import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

export async function productRoutes(app: FastifyInstance) {
  // 1. Public: Get All Active Products with Filtering & Sorting
  app.get('/', async (request, reply) => {
    const querySchema = z.object({
      q: z.string().optional(),
      category: z.string().optional(),
      scale: z.string().optional(),
      featured: z.string().optional(),
      sort: z.enum(['featured', 'price-asc', 'price-desc', 'newest']).optional(),
      page: z.string().optional().transform(v => (v ? parseInt(v) : 1)),
      limit: z.string().optional().transform(v => (v ? parseInt(v) : 20))
    });

    const query = querySchema.parse(request.query);
    const where: any = { isActive: true };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } }
      ];
    }

    if (query.category && query.category !== 'ALL') {
      where.category = { slug: query.category };
    }

    if (query.scale && query.scale !== 'ALL') {
      where.scaleRatio = query.scale;
    }

    if (query.featured === 'true') {
      where.isFeatured = true;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === 'price-asc') orderBy = { price: 'asc' };
    if (query.sort === 'price-desc') orderBy = { price: 'desc' };

    const skip = (query.page - 1) * query.limit;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { displayOrder: 'asc' } }
        },
        orderBy,
        skip,
        take: query.limit
      }),
      prisma.product.count({ where })
    ]);

    return reply.send({
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: Number(p.price),
        salePrice: p.salePrice ? Number(p.salePrice) : undefined,
        stock: p.stock,
        sku: p.sku,
        scaleRatio: p.scaleRatio,
        isFeatured: p.isFeatured,
        category: p.category?.slug || '',
        categoryName: p.category?.name || '',
        image: p.images?.find(img => img.isPrimary)?.url || p.images?.[0]?.url || '',
        images: p.images?.map(img => img.url) || []
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / query.limit)
      }
    });
  });

  // 2. Public: Get Single Product by ID or Slug
  app.get('/:identifier', async (request, reply) => {
    const { identifier } = request.params as { identifier: string };

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }]
      },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } }
      }
    });

    if (!product) {
      return reply.status(404).send({ error: 'Product not found.' });
    }

    return reply.send({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : undefined,
      stock: product.stock,
      sku: product.sku,
      scaleRatio: product.scaleRatio,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      category: product.category.slug,
      categoryName: product.category.name,
      image: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url || '',
      images: product.images.map(img => img.url),
      createdAt: product.createdAt
    });
  });

  // 3. Admin: Create Product
  app.post('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string(),
      price: z.number().positive(),
      salePrice: z.number().optional(),
      stock: z.number().int().nonnegative().default(0),
      sku: z.string(),
      scaleRatio: z.string().optional(),
      categoryId: z.string(),
      isFeatured: z.boolean().default(false),
      isActive: z.boolean().default(true),
      images: z.array(z.string()).default([])
    });

    const body = schema.parse(request.body);
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
        description: body.description,
        price: body.price,
        salePrice: body.salePrice,
        stock: body.stock,
        sku: body.sku,
        scaleRatio: body.scaleRatio,
        categoryId: body.categoryId,
        isFeatured: body.isFeatured,
        isActive: body.isActive,
        images: {
          create: body.images.map((url, idx) => ({
            url,
            displayOrder: idx,
            isPrimary: idx === 0
          }))
        }
      },
      include: { images: true, category: true }
    });

    return reply.status(201).send(product);
  });

  // 4. Admin: Update Product & Pricing
  app.put('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().positive().optional(),
      salePrice: z.number().nullable().optional(),
      stock: z.number().int().nonnegative().optional(),
      sku: z.string().optional(),
      scaleRatio: z.string().optional(),
      categoryId: z.string().optional(),
      isFeatured: z.boolean().optional(),
      isActive: z.boolean().optional(),
      images: z.array(z.string()).optional()
    });

    const body = schema.parse(request.body);

    const updated = await prisma.$transaction(async (tx) => {
      if (body.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: body.images.map((url, idx) => ({
            productId: id,
            url,
            displayOrder: idx,
            isPrimary: idx === 0
          }))
        });
      }

      return tx.product.update({
        where: { id },
        data: {
          name: body.name,
          description: body.description,
          price: body.price,
          salePrice: body.salePrice,
          stock: body.stock,
          sku: body.sku,
          scaleRatio: body.scaleRatio,
          categoryId: body.categoryId,
          isFeatured: body.isFeatured,
          isActive: body.isActive
        },
        include: { images: true }
      });
    });

    return reply.send(updated);
  });

  // 5. Admin: Quick Stock Adjuster
  app.patch('/admin/:id/stock', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ stock: z.number().int().nonnegative() });
    const { stock } = schema.parse(request.body);

    const product = await prisma.product.update({
      where: { id },
      data: { stock }
    });

    return reply.send({ id: product.id, stock: product.stock });
  });

  // 6. Admin: Delete Product
  app.delete('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.product.delete({ where: { id } });
    return reply.send({ success: true, message: 'Product removed from catalog.' });
  });
}
