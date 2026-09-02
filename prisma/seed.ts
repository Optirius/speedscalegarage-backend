import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏁 Starting SpeedScale Garage Database Seeding...');

  // 1. Create Default Admin
  const adminPassword = await bcrypt.hash('speedscale123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@speedscalegarage.com' },
    update: {},
    create: {
      email: 'admin@speedscalegarage.com',
      passwordHash: adminPassword,
      name: 'Garage Commander (Admin)',
      phone: '01700000000',
      role: 'ADMIN',
      authProvider: 'LOCAL'
    }
  });
  console.log('👤 Admin user seeded:', admin.email);

  // 2. Seed Categories
  const categories = [
    {
      id: 'classic-cars',
      name: 'Classic Legends',
      slug: 'classic-cars',
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=600',
      description: 'Iconic vintage racers and timeless muscle machines',
      displayOrder: 1
    },
    {
      id: 'modern-supercars',
      name: 'Modern Supercars',
      slug: 'modern-supercars',
      image: 'https://images.unsplash.com/photo-1544636331-e268592033c2?auto=format&fit=crop&q=80&w=600',
      description: 'Hypercars, track weapons, and exotic European engineering',
      displayOrder: 2
    },
    {
      id: 'racing-models',
      name: 'GT & Motorsport',
      slug: 'racing-models',
      image: 'https://images.unsplash.com/photo-1594739433321-2911701b044d?auto=format&fit=crop&q=80&w=600',
      description: 'Endurance champions, Le Mans, and Formula racers',
      displayOrder: 3
    },
    {
      id: 'gadgets',
      name: 'Garage & Accessories',
      slug: 'gadgets',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
      description: 'Display dioramas, LED display cases, and precision tools',
      displayOrder: 4
    }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat
    });
  }
  console.log(`📁 ${categories.length} Categories seeded.`);

  // 3. Seed Products
  const products = [
    {
      name: '1:18 1967 Ford Mustang GTA Fastback',
      slug: '1-18-1967-ford-mustang-gta-fastback',
      price: 8900,
      salePrice: 7990,
      stock: 12,
      sku: 'SSG-0018-MST',
      scaleRatio: '1:18',
      categoryId: 'classic-cars',
      isFeatured: true,
      description: 'Exquisite 1:18 scale metal diecast replica of the legendary 1967 Ford Mustang GTA Fastback. Features opening hood, doors, functioning steering, detailed engine bay with chrome air filter, and rubber real-rider tires.',
      images: [
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800'
      ]
    },
    {
      name: '1:24 Lamborghini Aventador SVJ (Giallo Orion)',
      slug: '1-24-lamborghini-aventador-svj-giallo',
      price: 4800,
      salePrice: 4250,
      stock: 7,
      sku: 'SSG-0024-AVT',
      scaleRatio: '1:24',
      categoryId: 'modern-supercars',
      isFeatured: true,
      description: 'Aerodynamic track masterpiece. High-detail composite diecast model with scissor doors, carbon-effect rear wing, active aerodynamic diffusers, and ultra-gloss pearl yellow finish.',
      images: [
        'https://images.unsplash.com/photo-1544636331-e268592033c2?auto=format&fit=crop&q=80&w=800'
      ]
    },
    {
      name: '1:18 Porsche 911 GT3 R #911 Manthey Racing',
      slug: '1-18-porsche-911-gt3-r-manthey',
      price: 11500,
      salePrice: 9900,
      stock: 4,
      sku: 'SSG-0018-P911',
      scaleRatio: '1:18',
      categoryId: 'racing-models',
      isFeatured: true,
      description: 'Nürburgring 24-Hour livery racing beast. Hand-assembled with authentic race livery, roll cage, BBS centre-lock wheels, race fuel intake valves, and realistic brake disc rotors.',
      images: [
        'https://images.unsplash.com/photo-1594739433321-2911701b044d?auto=format&fit=crop&q=80&w=800'
      ]
    },
    {
      name: 'Precision Model Car Detailing & Microfiber Kit',
      slug: 'precision-model-detailing-kit',
      price: 1250,
      stock: 35,
      sku: 'SSG-ACC-CLN',
      scaleRatio: 'Accessory',
      categoryId: 'gadgets',
      isFeatured: false,
      description: 'Anti-static dusting brush, micro-fiber cloths, and precision acrylic cleaning fluid for keeping your diecast paint and clear acrylic display cases crystal clear.',
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800'
      ]
    },
    {
      name: '1:64 Nissan Skyline GT-R R34 V-Spec II (Midnight Purple)',
      slug: '1-64-nissan-skyline-gtr-r34-midnight-purple',
      price: 2400,
      salePrice: 2150,
      stock: 18,
      sku: 'SSG-0064-R34',
      scaleRatio: '1:64',
      categoryId: 'modern-supercars',
      isFeatured: true,
      description: 'Premium 1:64 scale with opening hood, authentic engine detailing, rubber wheels, and real shifting color Midnight Purple III paint.',
      images: [
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800'
      ]
    }
  ];

  for (const prod of products) {
    const createdProd = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        name: prod.name,
        slug: prod.slug,
        price: prod.price,
        salePrice: prod.salePrice,
        stock: prod.stock,
        scaleRatio: prod.scaleRatio,
        categoryId: prod.categoryId,
        description: prod.description,
        isFeatured: prod.isFeatured
      },
      create: {
        name: prod.name,
        slug: prod.slug,
        price: prod.price,
        salePrice: prod.salePrice,
        stock: prod.stock,
        sku: prod.sku,
        scaleRatio: prod.scaleRatio,
        categoryId: prod.categoryId,
        description: prod.description,
        isFeatured: prod.isFeatured
      }
    });

    // Seed Images
    await prisma.productImage.deleteMany({ where: { productId: createdProd.id } });
    for (let i = 0; i < prod.images.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: createdProd.id,
          url: prod.images[i],
          displayOrder: i,
          isPrimary: i === 0
        }
      });
    }
  }
  console.log(`🚗 ${products.length} Diecast Products seeded.`);

  // 4. Seed Coupons
  const coupons = [
    { code: 'FB10', discountPercent: 10, minOrderValue: 0 },
    { code: 'SPEED10', discountPercent: 10, minOrderValue: 0 },
    { code: 'GARAGE20', discountPercent: 20, minOrderValue: 5000 }
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: c,
      create: c
    });
  }
  console.log(`🎟️ ${coupons.length} Discount Coupons seeded.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
