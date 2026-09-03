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

- [ ] **7.1 Schema Extensions (`prisma/schema.prisma`)**
  - [ ] `Review` Model (id, productId, userId, customerName, rating, title, comment, isVerifiedPurchase, isApproved, createdAt)
  - [ ] `Banner` Model (id, title, subtitle, badgeText, image, link, displayOrder, isActive, createdAt)
  - [ ] `StoreSetting` Model (key, value, description, updatedAt)
- [ ] **7.2 Product Reviews Module (`src/routes/review.routes.ts`)**
  - [ ] `GET /api/v1/reviews/product/:productId` (List approved reviews & computed average rating)
  - [ ] `POST /api/v1/reviews` (Customer submit review with automatic purchase verification)
  - [ ] `GET /api/v1/reviews/admin` (Admin list all reviews with status filters)
  - [ ] `PATCH /api/v1/reviews/admin/:id/status` (Admin approve/reject review)
  - [ ] `DELETE /api/v1/reviews/admin/:id` (Admin delete review)
- [ ] **7.3 Homepage Banners Module (`src/routes/banner.routes.ts`)**
  - [ ] `GET /api/v1/banners` (List active hero slides)
  - [ ] `POST /api/v1/banners/admin`, `PUT /api/v1/banners/admin/:id`, `DELETE /api/v1/banners/admin/:id`
- [ ] **7.4 Store Settings Module (`src/routes/setting.routes.ts`)**
  - [ ] `GET /api/v1/settings` (Public store configuration: shipping fees, contact phone, announcement marquee)
  - [ ] `PUT /api/v1/settings/admin` (Admin update store configuration)
- [ ] **7.5 Coupons Module (`src/routes/coupon.routes.ts`)**
  - [ ] `GET /api/v1/coupons/admin`, `POST /api/v1/coupons/admin`, `PUT /api/v1/coupons/admin/:id`, `DELETE /api/v1/coupons/admin/:id`
  - [ ] `POST /api/v1/coupons/validate` (Public validate coupon code & compute discount)
- [ ] **7.6 Database Seed & Migration Updates**
  - [ ] Add initial banner slides, default store settings, and sample customer reviews into seed script
  - [ ] Synchronize schema to Supabase via `npx prisma db push`
- [ ] **7.7 Unit Tests for New Modules**
  - [ ] Unit tests for Reviews, Banners, Settings, and Coupons endpoints
