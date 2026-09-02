# SPEEDSCALE GARAGE — Backend Implementation Checklist (`backend-repo`)

---

## 🛠️ 1. Project Initialization & Database Setup

- [x] **1.1 Server & Tooling Setup**
  - [x] Initialize Node.js + TypeScript project in `backend-repo`
  - [x] Install Fastify, `@fastify/cors`, `@fastify/jwt`, `@fastify/multipart`, `@fastify/static`, `zod`, `dotenv`
  - [x] Configure `tsconfig.json`, `tsx` for live reload
  - [x] Setup OpenAPI / Swagger UI route (`/api/docs`)
- [x] **1.2 PostgreSQL & Prisma ORM**
  - [x] Configure connection string in `.env` and `docker-compose.yml` for local Docker PostgreSQL
  - [x] Define Prisma schema models:
    - [x] `User` (id, email, passwordHash, name, phone, role, authProvider, createdAt)
    - [x] `Address` (id, userId, recipientName, phone, addressLine, city, area, isDefault)
    - [x] `Category` (id, name, slug, image, displayOrder)
    - [x] `Product` (id, name, slug, description, price, salePrice, stockQuantity, sku, scaleRatio, isActive, isFeatured, categoryId)
    - [x] `ProductImage` (id, productId, url, altText, displayOrder, isPrimary)
    - [x] `CartItem` (id, userId, productId, quantity, createdAt)
    - [x] `Order` (id, orderNumber, userId, totalAmount, shippingFee, discountAmount, status, paymentMethod, paymentStatus, shippingAddress, customerPhone, adminNotes)
    - [x] `OrderItem` (id, orderId, productId, productName, unitPrice, quantity, totalPrice)
    - [x] `Coupon` (id, code, discountPercent, minOrderValue, maxUses, usedCount, expiresAt, isActive)
  - [x] Generate Prisma client
  - [x] Write seed script (`prisma/seed.ts`) with initial categories, demo diecast products, and admin account

---

## 🔐 2. Authentication & Authorization Module

- [x] **2.1 Token & Password Management**
  - [x] Implement password hashing with `bcryptjs`
  - [x] JWT Access Token generation & verification
  - [x] Auth middleware (`authenticate`, `requireAdmin`)
- [x] **2.2 Auth Endpoints**
  - [x] `POST /api/v1/auth/register` (Customer registration)
  - [x] `POST /api/v1/auth/login` (Customer login)
  - [x] `POST /api/v1/auth/admin/login` (Admin login with role verification)
  - [x] `POST /api/v1/auth/facebook` (Verify Facebook OAuth access token and find/create user)
  - [x] `GET /api/v1/auth/me` (Fetch current user profile)

---

## 📦 3. Products, Categories & File Upload Pipeline

- [x] **3.1 Category Endpoints**
  - [x] `GET /api/v1/categories` (Public list with product counts)
  - [x] `POST /api/v1/admin/categories` (Admin create category)
- [x] **3.2 Product Endpoints**
  - [x] `GET /api/v1/products` (Public list with pagination, search, category filter, scale filter, sort)
  - [x] `GET /api/v1/products/:identifier` (Public single product details by id or slug)
  - [x] `POST /api/v1/products/admin` (Admin create product)
  - [x] `PUT /api/v1/products/admin/:id` (Admin update product & prices)
  - [x] `PATCH /api/v1/products/admin/:id/stock` (Admin quick stock update)
  - [x] `DELETE /api/v1/products/admin/:id` (Admin remove product)
- [x] **3.3 Image Upload & Optimization Pipeline**
  - [x] Setup multipart file handler (`@fastify/multipart`)
  - [x] Setup `sharp` pipeline to automatically convert uploaded images into compressed WebP format
  - [x] `POST /api/v1/uploads` (Uploads and serves optimized images)

---

## 🛒 4. Cart, Checkout & Orders Module

- [x] **4.1 Cart Endpoints**
  - [x] `GET /api/v1/cart` (Get user's server cart)
  - [x] `POST /api/v1/cart/add` (Add item to cart)
  - [x] `POST /api/v1/cart/merge` (Merge guest local cart with user's database cart on login)
  - [x] `DELETE /api/v1/cart/:productId` (Remove item from cart)
- [x] **4.2 Checkout & Order Endpoints**
  - [x] `POST /api/v1/orders/checkout` (Validate cart, deduct stock, generate order `SSG-ORD-XXXX`, record Cash on Delivery)
  - [x] `GET /api/v1/orders/my-orders` (Customer order history)
- [x] **4.3 Admin Order Management**
  - [x] `GET /api/v1/orders/admin` (Filter by status, search by phone/name/orderNumber)
  - [x] `PATCH /api/v1/orders/admin/:id/status` (Update status: Pending ➔ Confirmed ➔ Shipped ➔ Delivered ➔ Cancelled)
  - [x] `GET /api/v1/orders/admin/stats` (Revenue, order totals, low stock alerts)

---

## 🔗 5. Facebook Integrations & Webhooks

- [x] **5.1 Server-Side Facebook Conversions API (CAPI)**
  - [x] Service endpoint `POST /api/v1/facebook/events` for server-side event tracking
- [x] **5.2 Facebook Product Catalog Feed**
  - [x] Endpoint `GET /api/v1/facebook/catalog.xml` returning Facebook-compliant RSS/XML product feed for Facebook Commerce Manager
