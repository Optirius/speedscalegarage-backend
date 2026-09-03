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

- [ ] **8.1 Schema & Database Updates (`prisma/schema.prisma`)**
  - [ ] Add `paymentSenderNumber` (String?), `paymentTrxId` (String?), `paymentNotes` (String?) to `Order` model
  - [ ] Push schema to Supabase with `npx prisma db push` and regenerate Prisma client
- [ ] **8.2 Transactional Email Notification Service (`src/services/email.service.ts`)**
  - [ ] Install `nodemailer` and `@types/nodemailer`
  - [ ] Configure dynamic SMTP transport (via StoreSettings or `.env` fallback)
  - [ ] Build responsive HTML email template for **Admin Order & bKash Verification Alert**
  - [ ] Build responsive HTML email template for **Customer Order Receipt & Confirmation**
- [ ] **8.3 Checkout & Order Processing API Enhancements (`src/routes/order.routes.ts`)**
  - [ ] Support `paymentMethod: 'COD' | 'BKASH'` in `POST /api/v1/orders/checkout`
  - [ ] Validate bKash fields (`paymentSenderNumber`, `paymentTrxId`) when `paymentMethod === 'BKASH'`
  - [ ] Save payment details atomically in database transaction
  - [ ] Dispatch background email notification to admin notification email configured in StoreSettings
  - [ ] Add Admin Payment Status update endpoint `PATCH /api/v1/orders/admin/:id/payment`
- [ ] **8.4 Store Settings Keys for Payments & Notifications (`src/routes/setting.routes.ts`)**
  - [ ] `admin_notification_email` (Destination for order & TrxID alerts)
  - [ ] `bkash_number` (bKash Wallet Phone Number for Send Money)
  - [ ] `bkash_account_type` (Personal / Merchant / Agent)
  - [ ] `bkash_instructions` (Customer instructions text)
  - [ ] `cod_enabled` & `bkash_enabled` toggles
- [ ] **8.5 Backend Unit & Integration Tests (`tests/payment-and-orders.test.ts`)**
  - [ ] Test COD order creation & email trigger
  - [ ] Test bKash order creation with sender number and TrxID validation
  - [ ] Test admin payment verification endpoint
