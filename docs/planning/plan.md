# SPEEDSCALE GARAGE — Backend Implementation Checklist (`backend-repo`)

---

## 🛠️ 1. Project Initialization & Database Setup

- [x] **1.1 Server & Tooling Setup (Fastify 5, TypeScript, Swagger)**
- [x] **1.2 PostgreSQL & Prisma ORM (Connected to Supabase)**

---

## 🔐 2. Authentication & Authorization Module

- [x] **2.1 Token & Password Management**
- [x] **2.2 Auth Endpoints (`/register`, `/login`, `/admin/login`, `/me`, `/facebook`)**

---

## 📦 3. Products, Categories & File Upload Pipeline

- [x] **3.1 Category Endpoints**
- [x] **3.2 Product Endpoints (Public list, filter, admin CRUD, stock patch)**
- [x] **3.3 Image Upload & Optimization Pipeline (Sharp WebP)**

---

## 🛒 4. Cart, Checkout & Orders Module

- [x] **4.1 Cart Endpoints (Get, add, merge, remove)**
- [x] **4.2 Checkout & Order Endpoints (Cash on Delivery, status pipeline)**
- [x] **4.3 Admin Order Management & KPI Stats**

---

## 🔗 5. Facebook Integrations & Webhooks

- [x] **5.1 Server-Side Facebook Conversions API (CAPI)**
- [x] **5.2 Facebook Product Catalog Feed (`/catalog.xml`)**

---

## 🧪 6. Backend Unit & Integration Testing Suite

- [x] **6.1 Test Tooling Setup (Vitest)**
- [x] **6.2 Route & Controller Unit Tests (14 Tests Passing)**

---

## 🌟 7. Dynamic Data Architecture & Management APIs

- [x] **7.1 Schema Extensions (`prisma/schema.prisma`)**
- [x] **7.2 Product Reviews Module (`src/routes/review.routes.ts`)**
- [x] **7.3 Homepage Banners Module (`src/routes/banner.routes.ts`)**
- [x] **7.4 Store Settings Module (`src/routes/setting.routes.ts`)**
- [x] **7.5 Coupons Module (`src/routes/coupon.routes.ts`)**
- [x] **7.6 Database Seed & Migration Updates**
- [x] **7.7 Unit Tests for New Modules (26/26 passing)**

---

## 💳 8. Payment System & Email Notification Module (COD & bKash)

- [x] **8.1 Schema & Database Updates (`prisma/schema.prisma`)**
  - [x] Add `paymentSenderNumber` (String?), `paymentTrxId` (String?), `paymentNotes` (String?) to `Order` model
  - [x] Push schema to Supabase with `npx prisma db push` and regenerate Prisma client
- [x] **8.2 Transactional Email Notification Service (`src/services/email.service.ts`)**
  - [x] Install `nodemailer` and `@types/nodemailer`
  - [x] Configure dynamic SMTP transport (via StoreSettings or `.env` fallback)
  - [x] Build responsive HTML email template for **Admin Order & bKash Verification Alert**
  - [x] Build responsive HTML email template for **Customer Order Receipt & Confirmation**
- [x] **8.3 Checkout & Order Processing API Enhancements (`src/routes/order.routes.ts`)**
  - [x] Support `paymentMethod: 'COD' | 'BKASH'` in `POST /api/v1/orders/checkout`
  - [x] Validate bKash fields (`paymentSenderNumber`, `paymentTrxId`) when `paymentMethod === 'BKASH'`
  - [x] Save payment details atomically in database transaction
  - [x] Dispatch background email notification to admin notification email configured in StoreSettings
  - [x] Add Admin Payment Status update endpoint `PATCH /api/v1/orders/admin/:id/payment`
- [x] **8.4 Store Settings Keys for Payments & Notifications (`src/routes/setting.routes.ts`)**
  - [x] `admin_notification_email` (Destination for order & TrxID alerts)
  - [x] `bkash_number` (bKash Wallet Phone Number for Send Money)
  - [x] `bkash_account_type` (Personal / Merchant / Agent)
  - [x] `bkash_instructions` (Customer instructions text)
  - [x] `cod_enabled` & `bkash_enabled` toggles
- [x] **8.5 Backend Unit & Integration Tests (`tests/payment-and-orders.test.ts`)**
  - [x] Test COD order creation & email trigger
  - [x] Test bKash order creation with sender number and TrxID validation
  - [x] Test admin payment verification endpoint

---

## 👥 9. User Management & Customer 360 Module (`/api/v1/users/admin`)

- [x] **9.1 Schema & Database Updates (`prisma/schema.prisma`)**
  - [x] Add `isActive Boolean @default(true)` to `User` model
  - [x] Run `npx prisma db push` and `npx prisma generate`
  - [x] Update `tests/setup.ts` in-memory Prismock seed fixtures with `isActive: true`
- [x] **9.2 Auth & Security Guard Enforcement**
  - [x] Enforce `isActive` check in `/auth/login` and `/auth/facebook` (return 403 if disabled)
  - [x] Enforce `isActive` check in `authenticate` middleware (`src/middlewares/auth.middleware.ts`)
- [x] **9.3 Admin User Management Endpoints (`src/routes/user.routes.ts`)**
  - [x] `GET /api/v1/users/admin`: Paginated customer list with query, role, and status filters, including cart item counts, order counts, and total spend
  - [x] `GET /api/v1/users/admin/:id`: Customer 360 detail endpoint returning full profile, live cart items (with product images, variants, unit prices, line totals), orders history, saved addresses, and reviews
  - [x] `PATCH /api/v1/users/admin/:id/status`: Toggle active status (`{ isActive: boolean }`)
  - [x] `PATCH /api/v1/users/admin/:id/role`: Change role (`{ role: 'ADMIN' | 'CUSTOMER' }`)
  - [x] `DELETE /api/v1/users/admin/:id`: Delete customer account with cascading relations
- [x] **9.4 Self-Protection Guardrails**
  - [x] Prevent admin from disabling their own account
  - [x] Prevent admin from demoting their own account
  - [x] Prevent disabling or demoting the last remaining active admin
- [x] **9.5 Register Router in Fastify Engine (`src/app.ts`)**
  - [x] Register `userRoutes` under prefix `/api/v1/users`
- [x] **9.6 Backend Unit & Integration Tests (`tests/user.test.ts`)**
  - [x] Test admin listing users with search, role, and status filters
  - [x] Test Customer 360 detail endpoint with live cart items inspection
  - [x] Test enabling and disabling user accounts
  - [x] Test role promotion and demotion
  - [x] Test self-protection rules (self-demotion / self-disabling blocked)
