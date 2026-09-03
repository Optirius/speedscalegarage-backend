import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initDatabase() {
  console.log('\n==================================================');
  console.log('🏎️  SPEEDSCALE GARAGE — POSTGRESQL INITIALIZER');
  console.log('==================================================\n');

  try {
    // 1. Push Prisma schema to PostgreSQL
    console.log('📦 Step 1/2: Synchronizing schema and creating tables in PostgreSQL...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ Tables synchronized successfully!\n');

    // 2. Seed Database
    console.log('🌱 Step 2/2: Seeding initial data, accounts & products...\n');

    // 3.1 Create Dummy Admin Account
    const adminPassword = await bcrypt.hash('speedscale123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@speedscalegarage.com' },
      update: {
        passwordHash: adminPassword,
        role: 'ADMIN',
        name: 'Garage Commander (Admin)',
        phone: '01711000000'
      },
      create: {
        email: 'admin@speedscalegarage.com',
        passwordHash: adminPassword,
        name: 'Garage Commander (Admin)',
        phone: '01711000000',
        role: 'ADMIN',
        authProvider: 'LOCAL'
      }
    });
    console.log(`👤 Admin Account Created: ${admin.email} (Password: speedscale123)`);

    // 3.2 Create Dummy Customer Account
    const customerPassword = await bcrypt.hash('collector123', 10);
    const customer = await prisma.user.upsert({
      where: { email: 'collector@speedscalegarage.com' },
      update: {
        passwordHash: customerPassword,
        role: 'CUSTOMER',
        name: 'Tanvir Ahmed (Speed Collector)',
        phone: '01712345678'
      },
      create: {
        email: 'collector@speedscalegarage.com',
        passwordHash: customerPassword,
        name: 'Tanvir Ahmed (Speed Collector)',
        phone: '01712345678',
        role: 'CUSTOMER',
        authProvider: 'LOCAL'
      }
    });

    // Seed customer address
    await prisma.address.deleteMany({ where: { userId: customer.id } });
    await prisma.address.create({
      data: {
        userId: customer.id,
        recipientName: 'Tanvir Ahmed',
        phone: '01712345678',
        addressLine: 'House 42, Road 11, Block D, Banani',
        city: 'Dhaka',
        area: 'Banani',
        postalCode: '1213',
        isDefault: true
      }
    });
    console.log(`👤 Customer Account Created: ${customer.email} (Password: collector123)`);

    // 3.3 Seed Categories
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
    console.log(`📁 ${categories.length} Categories Seeded`);

    // 3.4 Seed Products
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

      // Seed Product Images
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
    console.log(`🚗 ${products.length} Products Seeded`);

    // 3.5 Seed Coupons
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
    console.log(`🎟️  ${coupons.length} Discount Coupons Seeded`);

    // 3.6 Seed Sample Order for the Customer
    const sampleOrder = await prisma.order.upsert({
      where: { orderNumber: 'SSG-ORD-1001' },
      update: {},
      create: {
        orderNumber: 'SSG-ORD-1001',
        userId: customer.id,
        customerName: 'Tanvir Ahmed',
        customerEmail: 'collector@speedscalegarage.com',
        customerPhone: '01712345678',
        deliveryArea: 'INSIDE_DHAKA',
        shippingAddress: 'House 42, Road 11, Block D, Banani, Dhaka',
        city: 'Dhaka',
        subtotal: 7990,
        shippingFee: 60,
        discountAmount: 0,
        totalAmount: 8050,
        status: 'SHIPPED',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        items: {
          create: [
            {
              productName: '1:18 1967 Ford Mustang GTA Fastback',
              image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=800',
              unitPrice: 7990,
              quantity: 1,
              totalPrice: 7990,
              scaleRatio: '1:18'
            }
          ]
        }
      }
    });
      { key: 'shipping_dhaka', value: '60', description: 'Inside Dhaka Standard Delivery Fee (BDT)' },
      { key: 'shipping_outside_dhaka', value: '120', description: 'Outside Dhaka Delivery Fee (BDT)' },
      { key: 'free_shipping_threshold', value: '15000', description: 'Subtotal threshold for free shipping (BDT)' },
      { key: 'admin_notification_email', value: 'admin@speedscalegarage.com', description: 'Email address where order notifications and bKash TrxID alerts are sent' },
      { key: 'bkash_number', value: '01700000000', description: 'bKash Wallet Number for Send Money' },
      { key: 'bkash_account_type', value: 'Personal', description: 'bKash Account Type (Personal / Merchant / Agent)' },
      { key: 'bkash_instructions', value: 'Please Send Money to the bKash number and enter your Sender Phone number & Transaction ID (TrxID) below.', description: 'bKash customer instructions' },
      { key: 'cod_enabled', value: 'true', description: 'Enable Cash on Delivery' },
      { key: 'bkash_enabled', value: 'true', description: 'Enable bKash Send Money' },
      { key: 'announcement_text', value: '⚡ Free Express Delivery on all Scale Model orders over ৳15,000 | 100% Authentic Diecast Collector Garage', description: 'Header announcement marquee' },
      { key: 'announcement_active', value: 'true', description: 'Toggle top announcement bar' },
      { key: 'contact_phone', value: '+880 1700-000000', description: 'Store direct call line' },
      { key: 'contact_whatsapp', value: '+8801700000000', description: 'WhatsApp order line' },
      { key: 'contact_email', value: 'support@speedscalegarage.com', description: 'Support email' },
      { key: 'facebook_page_url', value: 'https://facebook.com/speedscalegarage', description: 'Facebook Page URL' },
      { key: 'instagram_url', value: 'https://instagram.com/speedscalegarage', description: 'Instagram handle' }
    ];

    for (const s of defaultSettings) {
      await prisma.storeSetting.upsert({
        where: { key: s.key },
        update: { value: s.value, description: s.description },
        create: s
      });
    }
    console.log(`⚙️  ${defaultSettings.length} Store Configuration Settings Seeded`);

    // 3.8 Seed Dynamic Hero Banners
    const banners = [
      {
        title: 'Precision in Every Single Scale',
        subtitle: 'Bangladesh’s premier destination for authentic 1:18, 1:24, and 1:64 precision collector diecasts.',
        badgeText: '🏆 Premium Diecast Showcase',
        image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=1600',
        link: '/search',
        displayOrder: 1,
        isActive: true
      },
      {
        title: '1:18 Modern Hypercar Fleet',
        subtitle: 'Detailed opening engines, aerodynamic carbon textures, and steerable rubber wheels.',
        badgeText: '🔥 New Arrivals 2026',
        image: 'https://images.unsplash.com/photo-1544636331-e268592033c2?auto=format&fit=crop&q=80&w=1600',
        link: '/category/modern-supercars',
        displayOrder: 2,
        isActive: true
      }
    ];

    await prisma.banner.deleteMany({});
    for (const b of banners) {
      await prisma.banner.create({ data: b });
    }
    console.log(`🖼️  ${banners.length} Dynamic Hero Banners Seeded`);

    // 3.9 Seed Sample Customer Reviews for seeded products
    const mustang = await prisma.product.findFirst({ where: { sku: 'SSG-0018-MST' } });
    if (mustang) {
      await prisma.review.deleteMany({ where: { productId: mustang.id } });
      await prisma.review.createMany({
        data: [
          {
            productId: mustang.id,
            customerName: 'Ashikur R.',
            rating: 5,
            title: 'Flawless paint finish & heavy diecast weight!',
            comment: 'The door hinges and engine bay details are museum-grade. Packaging in double bubble wrap was exceptional.',
            isVerifiedPurchase: true,
            isApproved: true
          },
          {
            productId: mustang.id,
            customerName: 'Imtiaz Hossain',
            rating: 5,
            title: 'Best 1:18 Fastback in Bangladesh',
            comment: 'Arrived within 24 hours in Dhaka via Cash on Delivery. Truly 100% authentic.',
            isVerifiedPurchase: true,
            isApproved: true
          },
          {
            productId: mustang.id,
            customerName: 'Kazi Farhan',
            rating: 4,
            title: 'Great scale ratio and interior flocking',
            comment: 'Very sharp lines on the bodywork. Excellent communication on WhatsApp.',
            isVerifiedPurchase: true,
            isApproved: true
          }
        ]
      });
      console.log(`⭐ Sample Verified Collector Reviews Seeded for ${mustang.name}`);
    }

    console.log('\n==================================================');
    console.log('🎉 DATABASE INITIALIZATION COMPLETE!');
    console.log('==================================================');
    console.log('🔑 Credentials Reference:');
    console.log('   Admin:    admin@speedscalegarage.com     / speedscale123');
    console.log('   Customer: collector@speedscalegarage.com / collector123');
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Database Initialization Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();
