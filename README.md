# FreshCart — Full-Stack Online Grocery Shopping Application

FreshCart is a modern, full-stack online grocery e-commerce platform built with **React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Express, Drizzle ORM, and PostgreSQL**.

---

## Key Features

- **Customer Storefront**: Responsive hero search, 7 grocery categories (`Fruits & Vegetables`, `Dairy & Eggs`, `Bakery`, `Beverages`, `Snacks`, `Pantry`, `Household Essentials`), 35 seeded products, special offers, best sellers, price range filters, sorting, and pagination.
- **Authentication & Verification**:
  - Email/Password registration with Zod password rules, SHA-256 verification tokens, email verification gate, password reset flow, Remember Me persistence, and Google Sign-In via Firebase Auth.
- **Shopping Cart**:
  - Stock-aware quantity steppers, real-time item subtotals, free-delivery threshold tracker (`$35.00`), guest cart persistence (`localStorage`), and automatic database sync upon verified sign-in.
- **Checkout & Atomic Order Placement**:
  - Saved address picker, promo code support (`FRESH10`), Cash on Delivery (and clearly marked gateway-pending online payment option), server-side price & total calculation inside a PostgreSQL transaction (`db.transaction`), atomic stock decrement, and order confirmation receipt.
- **Order Tracking & Profile Management**:
  - Live 5-step order progress tracker, itemized order modals, eligible order cancellation (with stock restoration), saved addresses CRUD, and password updates.
- **Administrator Dashboard**:
  - Strictly backend-protected (`/api/admin/*`) analytics (revenue, orders, pending orders, products, customers), full product & category CRUD, local image uploads, order & payment status updates, and customer order history inspection.

---

## Architecture

```text
├── server.ts                  # Express API server + Vite SSR/static serving
├── src/
│   ├── db/
│   │   ├── schema.ts          # Drizzle PostgreSQL schema (7 tables + relations)
│   │   ├── drizzle.config.ts  # Drizzle Kit configuration
│   │   ├── index.ts           # pg Pool + Drizzle ORM client
│   │   ├── users.ts           # Profile sync & lookup helpers
│   │   └── seed.ts            # Idempotent seeder (7 categories, 35 products, admin/customer)
│   ├── middleware/auth.ts     # JWT + Firebase ID token verification & RBAC
│   ├── context/               # AuthContext & CartContext
│   ├── services/              # Typed API clients
│   ├── components/            # shadcn/ui primitives, layout, product cards, guards
│   ├── pages/                 # Home, Products, ProductDetails, Cart, Checkout, Orders, Profile, AdminDashboard
│   └── routes/                # AppRoutes
└── supabase/                  # Reference PostgreSQL schema, RLS policies & RPC scripts
```

---

## Demo Test Accounts (Pre-Seeded)

- **Customer**: `customer@freshcart.com` / `Customer@123456`
- **Admin**: `admin@freshcart.com` / `Admin@123456`
- Or sign in directly with **Google** or register a new email account and complete the email verification flow.

---

## Connecting an External Supabase Project (Optional)

Active runtime persistence in AI Studio is connected directly to **Cloud SQL for PostgreSQL** via Drizzle ORM and Express. If you also want to deploy with an external Supabase project:

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/01_schema.sql`, `supabase/02_rls_policies.sql`, and `supabase/03_functions_triggers.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Scripts

```bash
npm install      # Install dependencies
npm run dev      # Start full-stack Express + Vite server on port 3000
npm run lint     # TypeScript type check (tsc --noEmit)
npm run build    # Build production frontend bundle into dist/
```
