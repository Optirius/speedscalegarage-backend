import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function cleanSlate() {
  console.log('\n=============================================================');
  console.log('🧹 SPEEDSCALE GARAGE — DATABASE CLEAN SLATE & FRESH DEPLOY');
  console.log('=============================================================\n');

  try {
    // 1. Ensure Schema is Synced to PostgreSQL
    console.log('📦 Step 1/4: Ensuring PostgreSQL schema is up-to-date...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ Schema synchronized!\n');

    // 2. Wipe Transactional, Customer & Catalog Data
    console.log('🗑️  Step 2/4: Purging all transactional, customer and catalog data...');
    
    // Order items & Orders
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`   - Removed ${deletedOrders.count} orders (${deletedOrderItems.count} line items)`);

    // Reviews
    const deletedReviews = await prisma.review.deleteMany({});
    console.log(`   - Removed ${deletedReviews.count} customer reviews`);

    // Cart Items
    const deletedCarts = await prisma.cartItem.deleteMany({});
    console.log(`   - Cleared ${deletedCarts.count} customer cart items`);

    // Product Images & Products
    const deletedImages = await prisma.productImage.deleteMany({});
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`   - Removed ${deletedProducts.count} catalog products (${deletedImages.count} images)`);

    // Coupons
    const deletedCoupons = await prisma.coupon.deleteMany({});
    console.log(`   - Removed ${deletedCoupons.count} promotional coupons`);

    // Banners
    const deletedBanners = await prisma.banner.deleteMany({});
    console.log(`   - Removed ${deletedBanners.count} hero banners`);

    // Customer Addresses
    const deletedAddresses = await prisma.address.deleteMany({
      where: {
        user: {
          role: { not: 'ADMIN' }
        }
      }
    });
    console.log(`   - Removed ${deletedAddresses.count} customer delivery addresses`);

    // Non-Admin Users
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        role: { not: 'ADMIN' }
      }
    });
    console.log(`   - Removed ${deletedUsers.count} customer accounts (Preserved ADMIN accounts)\n`);

    // 3. Ensure Master Administrator Exists
    console.log('🔐 Step 3/4: Verifying Master Administrator account...');
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    let adminEmail = 'admin@speedscalegarage.com';
    if (existingAdmin) {
      adminEmail = existingAdmin.email;
      console.log(`   ✓ Existing Admin Account preserved: ${existingAdmin.email} (${existingAdmin.name})`);
    } else {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'speedscale123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      const newAdmin = await prisma.user.create({
        data: {
          email: process.env.ADMIN_EMAIL || 'admin@speedscalegarage.com',
          passwordHash,
          name: 'Master Administrator',
          role: 'ADMIN',
          authProvider: 'LOCAL'
        }
      });
      console.log(`   ✓ New Master Admin Account created: ${newAdmin.email} (Password: ${defaultPassword})`);
    }

    // 4. Initialize Essential Baseline Store Settings & Core Categories
    console.log('\n⚙️  Step 4/4: Initializing essential baseline configurations...');
    
    // Core Categories
    const defaultCategories = [
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

    for (const cat of defaultCategories) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, image: cat.image, description: cat.description, displayOrder: cat.displayOrder },
        create: cat
      });
    }
    console.log(`   ✓ ${defaultCategories.length} Baseline Categories ready`);

    // Baseline Store Settings
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
    console.log(`   ✓ ${defaultSettings.length} Core Store Settings configured`);

    // Baseline Default Banner
    await prisma.banner.create({
      data: {
        title: 'Precision in Every Single Scale',
        subtitle: 'Curated collection of hyper-detailed 1:18, 1:24, and 1:64 metal scale replicas. Fast delivery all across Bangladesh.',
        badgeText: '🏆 Premier Scale Diecast Gallery',
        image: 'https://images.unsplash.com/photo-1542362567-b055002b91f4?auto=format&fit=crop&q=80&w=1600',
        link: '/search',
        displayOrder: 1,
        isActive: true
      }
    });
    console.log(`   ✓ 1 Baseline Hero Banner created`);

    console.log('\n=============================================================');
    console.log('✨ CLEAN SLATE COMPLETE — READY FOR PRODUCTION DEPLOYMENT!');
    console.log('=============================================================');
    console.log(`🔑 Active Administrator: ${adminEmail}`);
    console.log('=============================================================\n');

  } catch (error) {
    console.error('❌ Clean Slate Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSlate();
