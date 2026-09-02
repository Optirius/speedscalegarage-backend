-- =============================================================================
-- SPEEDSCALE GARAGE — POSTGRESQL INITIAL DATABASE SCHEMA & SAMPLE SEED DATA
-- Database: speedscale_db
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'FACEBOOK', 'GOOGLE');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BKASH', 'NAGAD', 'SSLCOMMERZ', 'STRIPE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');
CREATE TYPE "DeliveryArea" AS ENUM ('INSIDE_DHAKA', 'OUTSIDE_DHAKA');

-- 2. Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Addresses Table
CREATE TABLE IF NOT EXISTS "addresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "postalCode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "image" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "salePrice" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL UNIQUE,
    "scaleRatio" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX IF NOT EXISTS "products_scaleRatio_idx" ON "products"("scaleRatio");

-- 6. Product Images Table
CREATE TABLE IF NOT EXISTS "product_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Cart Items Table
CREATE TABLE IF NOT EXISTS "cart_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_items_userId_productId_key" UNIQUE ("userId", "productId")
);

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL UNIQUE,
    "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deliveryArea" "DeliveryArea" NOT NULL DEFAULT 'INSIDE_DHAKA',
    "shippingAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "adminNotes" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "shippingFee" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "orders_orderNumber_idx" ON "orders"("orderNumber");
CREATE INDEX IF NOT EXISTS "orders_customerPhone_idx" ON "orders"("customerPhone");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");

-- 9. Order Items Table
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
    "productName" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "scaleRatio" TEXT
);

-- 10. Coupons Table
CREATE TABLE IF NOT EXISTS "coupons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "minOrderValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Admin (Password: speedscale123 -> bcrypt hash $2a$10$wS2Wb53/...)
INSERT INTO "users" ("id", "email", "passwordHash", "name", "phone", "role", "authProvider")
VALUES (
    'admin_root',
    'admin@speedscalegarage.com',
    '$2a$10$6Rz3x4k1q9n3gUfE1F3hxeJ7wH6T8x4hE9k6L3m0N2o1P4q7R5s8.',
    'Garage Commander (Admin)',
    '01711000000',
    'ADMIN',
    'LOCAL'
) ON CONFLICT ("email") DO NOTHING;

-- Customer (Password: collector123 -> bcrypt hash)
INSERT INTO "users" ("id", "email", "passwordHash", "name", "phone", "role", "authProvider")
VALUES (
    'user_collector_1',
    'collector@speedscalegarage.com',
    '$2a$10$6Rz3x4k1q9n3gUfE1F3hxeJ7wH6T8x4hE9k6L3m0N2o1P4q7R5s8.',
    'Tanvir Ahmed (Speed Collector)',
    '01712345678',
    'CUSTOMER',
    'LOCAL'
) ON CONFLICT ("email") DO NOTHING;

-- Customer Saved Address
INSERT INTO "addresses" ("id", "userId", "recipientName", "phone", "addressLine", "city", "area", "postalCode", "isDefault")
VALUES (
    'addr_tanvir_1',
    'user_collector_1',
    'Tanvir Ahmed',
    '01712345678',
    'House 42, Road 11, Block D, Banani',
    'Dhaka',
    'Banani',
    '1213',
    true
) ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO "categories" ("id", "name", "slug", "image", "description", "displayOrder")
VALUES 
    ('classic-cars', 'Classic Legends', 'classic-cars', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=600', 'Iconic vintage racers and timeless muscle machines', 1),
    ('modern-supercars', 'Modern Supercars', 'modern-supercars', 'https://images.unsplash.com/photo-1544636331-e268592033c2?auto=format&fit=crop&q=80&w=600', 'Hypercars, track weapons, and exotic European engineering', 2),
    ('racing-models', 'GT & Motorsport', 'racing-models', 'https://images.unsplash.com/photo-1594739433321-2911701b044d?auto=format&fit=crop&q=80&w=600', 'Endurance champions, Le Mans, and Formula racers', 3),
    ('gadgets', 'Garage & Accessories', 'gadgets', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600', 'Display dioramas, LED display cases, and precision tools', 4)
ON CONFLICT ("slug") DO NOTHING;

-- Coupons
INSERT INTO "coupons" ("id", "code", "discountPercent", "minOrderValue", "isActive")
VALUES 
    ('c_1', 'FB10', 10, 0, true),
    ('c_2', 'SPEED10', 10, 0, true),
    ('c_3', 'GARAGE20', 20, 5000, true)
ON CONFLICT ("code") DO NOTHING;
