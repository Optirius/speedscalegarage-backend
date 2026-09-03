import { PrismockClient } from 'prismock';
import bcrypt from 'bcryptjs';
import { beforeAll } from 'vitest';

// Safe structuredClone fallback for Prisma Decimal instances
const originalStructuredClone = globalThis.structuredClone;
if (originalStructuredClone) {
  globalThis.structuredClone = (val: any, options?: StructuredSerializeOptions) => {
    try {
      return originalStructuredClone(val, options);
    } catch (e) {
      return JSON.parse(JSON.stringify(val));
    }
  };
}

export const prismock = new PrismockClient();

// Attach in-memory Prismock to globalThis so src/lib/prisma.ts uses it instead of PostgreSQL
(globalThis as any).prisma = prismock;

beforeAll(async () => {
  await seedInMemoryDatabase();
});

// Seed base in-memory data needed by tests
export async function seedInMemoryDatabase() {
  // 1. Seed Admin
  const adminPasswordHash = await bcrypt.hash('speedscale123', 10);
  await (prismock as any).user.upsert({
    where: { email: 'admin@speedscalegarage.com' },
    update: { role: 'ADMIN', isActive: true },
    create: {
      id: 'a0000000-0000-4000-8000-000000000001',
      email: 'admin@speedscalegarage.com',
      name: 'SpeedScale Admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      authProvider: 'LOCAL'
    }
  });

  // 2. Seed Base Categories
  const jdmCat = await (prismock as any).category.upsert({
    where: { slug: 'jdm-legends' },
    update: {},
    create: {
      id: 'c0000000-0000-4000-8000-000000000001',
      name: 'Japanese Domestic Market (JDM)',
      slug: 'jdm-legends',
      image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738',
      description: 'Iconic drift and tuning machines'
    }
  });

  // 3. Seed Base Products
  await (prismock as any).product.upsert({
    where: { sku: 'SSG-JDM-001' },
    update: {},
    create: {
      id: 'p0000000-0000-4000-8000-000000000001',
      name: '1:18 Nissan Skyline GT-R R34 V-Spec II',
      slug: '1-18-nissan-skyline-gt-r-r34-v-spec-ii',
      description: 'Legendary Bayside Blue Diecast model',
      price: 8500,
      salePrice: 7990,
      stock: 50,
      sku: 'SSG-JDM-001',
      scaleRatio: '1:18',
      categoryId: jdmCat.id,
      isFeatured: true,
      isActive: true,
      images: {
        create: [
          { id: 'i0000000-0000-4000-8000-000000000001', url: 'https://images.unsplash.com/photo-1544636331-e268592033c2', isPrimary: true, displayOrder: 0 }
        ]
      }
    }
  });

  // 4. Seed Banners
  await (prismock as any).banner.upsert({
    where: { id: 'b0000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: 'b0000000-0000-4000-8000-000000000001',
      title: 'Legendary GT-R Arrivals',
      subtitle: 'Exclusive 1:18 JDM Classics',
      badgeText: 'New 2026',
      image: 'https://images.unsplash.com/photo-1544636331-e268592033c2',
      link: '/search',
      isActive: true,
      displayOrder: 1
    }
  });

  // 5. Seed Coupons
  await (prismock as any).coupon.upsert({
    where: { code: 'SPEED10' },
    update: {},
    create: {
      id: 'cp000000-0000-4000-8000-000000000001',
      code: 'SPEED10',
      discountPercent: 10,
      minOrderValue: 1000,
      isActive: true
    }
  });

  // 6. Seed Base Store Settings
  const settings = [
    { key: 'shipping_dhaka', value: '60' },
    { key: 'shipping_outside_dhaka', value: '120' },
    { key: 'free_shipping_threshold', value: '15000' },
    { key: 'admin_notification_email', value: 'admin@speedscalegarage.com' },
    { key: 'bkash_number', value: '01700000000' },
    { key: 'bkash_account_type', value: 'Personal' },
    { key: 'bkash_instructions', value: 'Send Money to our bKash number' },
    { key: 'cod_enabled', value: 'true' },
    { key: 'bkash_enabled', value: 'true' }
  ];

  for (const s of settings) {
    await (prismock as any).storeSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }
}
