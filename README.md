# SpeedScale Garage — Backend (`speedscalegarage-backend`)

> **High-Performance E-Commerce API Engine with PostgreSQL & Facebook Integrations**  
> Built with **Fastify 5**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**.

---

## 🏎️ Overview

This is the backend API service for **SpeedScale Garage**, providing high-throughput, low-latency e-commerce operations for authentic diecast model sales across Bangladesh. It features PostgreSQL schema migrations, JWT authentication with Role-Based Access Control, image optimization via Sharp, real-time inventory deduction, Cash on Delivery workflows, and Meta (Facebook) Commerce integrations.

---

## ✨ Features

* **⚡ Ultra-Low Latency API Engine:**
  * Built on **Fastify 5** with native TypeScript and non-blocking I/O (~70k req/sec throughput with ~1-2ms overhead).
* **🗄️ PostgreSQL & Prisma ORM:**
  * Clean relational schema modeling for `User`, `Address`, `Category`, `Product`, `ProductImage`, `CartItem`, `Order`, `OrderItem`, and `Coupon`.
  * Pre-configured Docker Compose environment and comprehensive database seeding script.
* **🔐 Authentication & RBAC:**
  * Short-lived JWT Access Tokens with Role-Based Access Control (`CUSTOMER` vs `ADMIN`).
  * `bcryptjs` password hashing and Facebook OAuth login verification.
* **📦 Product & Inventory Management:**
  * Full-text search and filtering by scale ratio (`1:18`, `1:24`, `1:64`), price, and category.
  * Multi-photo uploads converted to compressed WebP format using `sharp`.
  * Atomic stock reservation and inventory level updates.
* **🛒 Persistent Cart & Checkout Pipeline:**
  * Guest cart merging upon customer sign-in.
  * **Cash on Delivery (COD)** checkout with location-based shipping calculation (Dhaka ৳60 / Outside Dhaka ৳120 / Free over ৳15,000).
  * Order status pipeline management (`PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED` ➔ `CANCELLED`).
  * Admin KPI metrics (`/api/v1/orders/admin/stats`): Total revenue, pending count, low-stock alerts.
* **🔗 Facebook Commerce & Ads Integrations:**
  * **Dynamic Product Catalog XML Feed (`/api/v1/facebook/catalog.xml`):** Ready for polling by Meta Commerce Manager to enable product tagging on Facebook Page posts, Reels, and Instagram.
  * **Conversions API (CAPI) Endpoint (`/api/v1/facebook/events`):** Server-side event tracking for `PageView`, `ViewContent`, `AddToCart`, and `Purchase`.
* **📚 Interactive OpenAPI / Swagger Documentation:**
  * Live interactive documentation hosted at `/api/docs`.

---

## 🛠️ Tech Stack

* **Runtime:** [Node.js](https://nodejs.org/) (v18.0+)
* **Framework:** [Fastify 5](https://fastify.dev/)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **ORM:** [Prisma ORM](https://www.prisma.io/)
* **Database:** [PostgreSQL 16](https://www.postgresql.org/) (via Docker)
* **Image Processing:** [Sharp](https://sharp.pixelplumbing.com/)
* **Validation:** [Zod](https://zod.dev/)
* **Security:** `@fastify/jwt`, `@fastify/cors`, `bcryptjs`
* **Documentation:** `@fastify/swagger` & `@fastify/swagger-ui`

---

## 📁 Project Structure

```
backend-repo/
├── docs/
│   └── planning/
│       └── plan.md             # Detailed implementation checklist
├── prisma/
│   ├── schema.prisma           # PostgreSQL database schema
│   └── seed.ts                 # Database seeding script (Admin, Categories, Products)
├── src/
│   ├── config/
│   │   └── env.ts              # Zod environment variable validation
│   ├── lib/
│   │   └── prisma.ts           # Prisma client singleton
│   ├── middlewares/
│   │   └── auth.middleware.ts  # JWT and Admin RBAC middlewares
│   ├── routes/
│   │   ├── auth.routes.ts      # Register, login, admin auth, Facebook OAuth
│   │   ├── cart.routes.ts      # Cart sync & guest merge
│   │   ├── category.routes.ts  # Category listings & admin CRUD
│   │   ├── facebook.routes.ts  # Facebook Catalog XML & Conversions API
│   │   ├── order.routes.ts     # COD checkout & admin pipeline
│   │   ├── product.routes.ts   # Product catalog & stock updater
│   │   └── upload.routes.ts    # Sharp WebP image resizing pipeline
│   └── server.ts               # Fastify bootstrap & Swagger setup
├── .env.example                # Example environment variables
├── docker-compose.yml          # Local PostgreSQL Docker setup
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js (v18.0 or higher)
* Docker & Docker Compose (for PostgreSQL)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Optirius/speedscalegarage-backend.git
cd speedscalegarage-backend

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the sample environment file and configure variables as needed:
```bash
cp .env.example .env
```

### 4. Start PostgreSQL (Docker)
```bash
docker compose up -d
```

### 5. Apply Database Migrations & Seed Data
```bash
# Generate Prisma Client
npx prisma generate

# Apply Migrations
npx prisma migrate dev --name init

# Seed default admin, categories, and demo diecast models
npm run prisma:seed
```

### 6. Start the API Server
```bash
# Development mode with hot-reloading
npm run dev

# Production build
npm run build
npm start
```

* **API Base URL:** `http://localhost:4000`
* **Interactive Swagger UI:** `http://localhost:4000/api/docs`
* **Facebook Catalog Feed:** `http://localhost:4000/api/v1/facebook/catalog.xml`

---

## 🔐 Default Admin Account (Seeded)
* **Email:** `admin@speedscalegarage.com`
* **Password:** `speedscale123`
* **Role:** `ADMIN`

---

## 📄 License
Private repository for SpeedScale Garage. All rights reserved.
