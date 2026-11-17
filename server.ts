import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { db } from './src/db/index.ts';
import {
  addresses,
  cartItems,
  categories,
  orderItems,
  orders,
  products,
  profiles,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import { findProfileByEmail } from './src/db/users.ts';
import {
  AuthRequest,
  requireAdmin,
  requireAuth,
  requireVerified,
  signSessionToken,
} from './src/middleware/auth.ts';

dotenv.config();

const PORT = 3000;
const FREE_DELIVERY_THRESHOLD = 35;
const STANDARD_DELIVERY_FEE = 4.99;

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function sanitizeUser(profile: typeof profiles.$inferSelect) {
  return {
    id: profile.id,
    uid: profile.uid,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone ?? '',
    role: profile.role,
    emailVerified: profile.emailVerified,
    createdAt: profile.createdAt,
  };
}

function formatMoney(val: number): string {
  return (Math.round(val * 100) / 100).toFixed(2);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  // Lazily ensure database has initial categories, 35 sample products, and admin/customer seed accounts
  app.use('/api', async (_req, res, next) => {
    try {
      await ensureSeeded();
      next();
    } catch (error) {
      console.error('Seed check error:', error);
      res.status(503).json({
        error: 'Database service is initializing. Please retry in a moment.',
      });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'FreshCart API' });
  });

  // ---------------------------------------------------------------------------
  // AUTHENTICATION ROUTES
  // ---------------------------------------------------------------------------

  const registerSchema = z.object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message || 'Invalid registration data.' });
      }

      const normalizedEmail = parsed.data.email.toLowerCase();
      const existing = await findProfileByEmail(normalizedEmail);
      if (existing) {
        return res
          .status(409)
          .json({ error: 'An account with this email address already exists.' });
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const uid = `local-${crypto.randomUUID()}`;

      const [created] = await db
        .insert(profiles)
        .values({
          uid,
          fullName: parsed.data.fullName,
          email: normalizedEmail,
          passwordHash,
          role: 'customer',
          emailVerified: false,
          verificationTokenHash: tokenHash,
        })
        .returning();

      const verifyPath = `/verify-email?token=${encodeURIComponent(rawToken)}`;

      return res.status(201).json({
        message:
          'Account created! Please verify your email address to activate shopping and checkout.',
        user: sanitizeUser(created),
        verificationPath: verifyPath,
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Failed to create account.' });
    }
  });

  const loginSchema = z.object({
    email: z.string().trim().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message || 'Invalid credentials.' });
      }

      const profile = await findProfileByEmail(parsed.data.email);
      if (!profile || !profile.passwordHash) {
        return res
          .status(401)
          .json({ error: 'Invalid email address or password.' });
      }

      const validPassword = await bcrypt.compare(
        parsed.data.password,
        profile.passwordHash
      );
      if (!validPassword) {
        return res
          .status(401)
          .json({ error: 'Invalid email address or password.' });
      }

      if (!profile.emailVerified) {
        return res.status(403).json({
          error: 'Email address not verified. Please verify your email before signing in.',
          code: 'EMAIL_NOT_VERIFIED',
          email: profile.email,
        });
      }

      const token = signSessionToken(profile, parsed.data.rememberMe ?? true);
      return res.json({
        token,
        user: sanitizeUser(profile),
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Unable to sign in right now.' });
    }
  });

  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const token = String(req.body?.token || '').trim();
      if (!token) {
        return res.status(400).json({ error: 'Verification token is missing.' });
      }

      const tokenHash = hashToken(token);
      const found = await db
        .select()
        .from(profiles)
        .where(eq(profiles.verificationTokenHash, tokenHash))
        .limit(1);

      if (found.length === 0) {
        return res.status(400).json({
          error: 'Verification link is invalid or has already been used.',
        });
      }

      const [updated] = await db
        .update(profiles)
        .set({
          emailVerified: true,
          verificationTokenHash: null,
        })
        .where(eq(profiles.id, found[0].id))
        .returning();

      const sessionToken = signSessionToken(updated, true);
      return res.json({
        message: 'Email verified successfully. Welcome to FreshCart!',
        token: sessionToken,
        user: sanitizeUser(updated),
      });
    } catch (error) {
      console.error('Verify email error:', error);
      return res.status(500).json({ error: 'Email verification failed.' });
    }
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      const profile = await findProfileByEmail(email);
      if (!profile) {
        return res.json({
          message: 'If an unverified account exists, a verification link has been prepared.',
        });
      }

      if (profile.emailVerified) {
        return res.status(400).json({ error: 'This email address is already verified.' });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      await db
        .update(profiles)
        .set({ verificationTokenHash: hashToken(rawToken) })
        .where(eq(profiles.id, profile.id));

      return res.json({
        message: 'A new verification link has been sent.',
        verificationPath: `/verify-email?token=${encodeURIComponent(rawToken)}`,
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({ error: 'Failed to resend verification email.' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ error: 'Please provide your email address.' });
      }

      const profile = await findProfileByEmail(email);
      if (!profile) {
        return res.json({
          message: 'If an account matches this email, password reset instructions have been issued.',
        });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(profiles)
        .set({
          resetTokenHash: hashToken(rawToken),
          resetTokenExpiresAt: expiresAt,
        })
        .where(eq(profiles.id, profile.id));

      return res.json({
        message: 'Password reset link generated. Follow the link to choose a new password.',
        resetPath: `/reset-password?token=${encodeURIComponent(rawToken)}`,
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ error: 'Failed to process password reset request.' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const schema = z.object({
        token: z.string().min(10),
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/[A-Z]/, 'Password must contain an uppercase letter')
          .regex(/[0-9]/, 'Password must contain a number'),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message || 'Invalid reset data.' });
      }

      const tokenHash = hashToken(parsed.data.token);
      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.resetTokenHash, tokenHash))
        .limit(1);

      if (rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired reset link.' });
      }

      const profile = rows[0];
      if (!profile.resetTokenExpiresAt || profile.resetTokenExpiresAt < new Date()) {
        return res.status(400).json({ error: 'This password reset link has expired.' });
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      await db
        .update(profiles)
        .set({
          passwordHash,
          emailVerified: true,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        })
        .where(eq(profiles.id, profile.id));

      return res.json({
        message: 'Your password has been updated. You can now sign in.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ error: 'Failed to reset password.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    return res.json({ user: sanitizeUser(req.profile!) });
  });

  app.put('/api/auth/profile', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const schema = z.object({
        fullName: z.string().trim().min(2).max(80),
        phone: z.string().trim().max(25).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile input.' });
      }

      const [updated] = await db
        .update(profiles)
        .set({
          fullName: parsed.data.fullName,
          phone: parsed.data.phone ?? '',
        })
        .where(eq(profiles.id, req.profile!.id))
        .returning();

      return res.json({ user: sanitizeUser(updated) });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  app.put('/api/auth/change-password', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const schema = z.object({
        currentPassword: z.string().optional(),
        newPassword: z
          .string()
          .min(8, 'New password must be at least 8 characters')
          .regex(/[A-Z]/, 'New password must contain an uppercase letter')
          .regex(/[0-9]/, 'New password must contain a number'),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password.' });
      }

      const profile = req.profile!;
      if (profile.passwordHash) {
        if (!parsed.data.currentPassword) {
          return res.status(400).json({ error: 'Current password is required.' });
        }
        const ok = await bcrypt.compare(parsed.data.currentPassword, profile.passwordHash);
        if (!ok) {
          return res.status(400).json({ error: 'Current password is incorrect.' });
        }
      }

      const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
      await db
        .update(profiles)
        .set({ passwordHash: newHash })
        .where(eq(profiles.id, profile.id));

      return res.json({ message: 'Password updated successfully.' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Failed to update password.' });
    }
  });

  // ---------------------------------------------------------------------------
  // PUBLIC CATALOG ROUTES (CATEGORIES & PRODUCTS)
  // ---------------------------------------------------------------------------

  app.get('/api/categories', async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          imageUrl: categories.imageUrl,
          createdAt: categories.createdAt,
          productCount: sql<number>`cast(count(${products.id}) as int)`,
        })
        .from(categories)
        .leftJoin(products, eq(categories.id, products.categoryId))
        .groupBy(categories.id)
        .orderBy(asc(categories.id));

      return res.json({ categories: rows });
    } catch (error) {
      console.error('Fetch categories error:', error);
      return res.status(500).json({ error: 'Failed to load categories.' });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const search = String(req.query.search || '').trim();
      const categorySlug = String(req.query.category || '').trim();
      const categoryIdParam = Number(req.query.categoryId || 0);
      const minPrice = Number(req.query.minPrice || 0);
      const maxPrice = Number(req.query.maxPrice || 0);
      const sort = String(req.query.sort || 'featured');
      const featuredOnly = req.query.featured === 'true';
      const offersOnly = req.query.offers === 'true';
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 12)));
      const offset = (page - 1) * limit;

      const conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(products.name, `%${search}%`),
            ilike(products.description, `%${search}%`)
          )
        );
      }

      if (categoryIdParam > 0) {
        conditions.push(eq(products.categoryId, categoryIdParam));
      } else if (categorySlug && categorySlug !== 'all') {
        const matchedCat = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, categorySlug))
          .limit(1);
        if (matchedCat.length > 0) {
          conditions.push(eq(products.categoryId, matchedCat[0].id));
        } else {
          return res.json({
            products: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          });
        }
      }

      if (minPrice > 0) {
        conditions.push(gte(products.price, minPrice.toFixed(2)));
      }
      if (maxPrice > 0) {
        conditions.push(lte(products.price, maxPrice.toFixed(2)));
      }
      if (featuredOnly) {
        conditions.push(eq(products.isFeatured, true));
      }
      if (offersOnly) {
        conditions.push(sql`${products.originalPrice} IS NOT NULL AND ${products.originalPrice} > ${products.price}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const orderByClause =
        sort === 'price_asc'
          ? asc(products.price)
          : sort === 'price_desc'
          ? desc(products.price)
          : sort === 'best_selling'
          ? desc(products.salesCount)
          : sort === 'newest'
          ? desc(products.createdAt)
          : desc(products.isFeatured);

      const [{ total }] = await db
        .select({ total: sql<number>`cast(count(*) as int)` })
        .from(products)
        .where(whereClause);

      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          unit: products.unit,
          price: products.price,
          originalPrice: products.originalPrice,
          categoryId: products.categoryId,
          categoryName: categories.name,
          categorySlug: categories.slug,
          imageUrl: products.imageUrl,
          stock: products.stock,
          isFeatured: products.isFeatured,
          salesCount: products.salesCount,
          createdAt: products.createdAt,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(whereClause)
        .orderBy(orderByClause, asc(products.id))
        .limit(limit)
        .offset(offset);

      return res.json({
        products: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Fetch products error:', error);
      return res.status(500).json({ error: 'Failed to load grocery products.' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid product ID.' });
      }

      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          unit: products.unit,
          price: products.price,
          originalPrice: products.originalPrice,
          categoryId: products.categoryId,
          categoryName: categories.name,
          categorySlug: categories.slug,
          imageUrl: products.imageUrl,
          stock: products.stock,
          isFeatured: products.isFeatured,
          salesCount: products.salesCount,
          createdAt: products.createdAt,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.id, id))
        .limit(1);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Product not found.' });
      }

      const product = rows[0];
      const related = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          unit: products.unit,
          price: products.price,
          originalPrice: products.originalPrice,
          categoryId: products.categoryId,
          categoryName: categories.name,
          categorySlug: categories.slug,
          imageUrl: products.imageUrl,
          stock: products.stock,
          isFeatured: products.isFeatured,
          salesCount: products.salesCount,
          createdAt: products.createdAt,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.categoryId, product.categoryId),
            sql`${products.id} != ${product.id}`
          )
        )
        .orderBy(desc(products.salesCount))
        .limit(4);

      return res.json({ product, related });
    } catch (error) {
      console.error('Fetch single product error:', error);
      return res.status(500).json({ error: 'Failed to load product details.' });
    }
  });

  // ---------------------------------------------------------------------------
  // SHOPPING CART ROUTES (AUTHENTICATED + VERIFIED)
  // ---------------------------------------------------------------------------

  async function getFormattedCart(userId: number) {
    const items = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        name: products.name,
        unit: products.unit,
        price: products.price,
        originalPrice: products.originalPrice,
        imageUrl: products.imageUrl,
        stock: products.stock,
        categoryName: categories.name,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(asc(cartItems.createdAt));

    let subtotal = 0;
    let totalQuantity = 0;
    let savings = 0;

    const enriched = items.map((item) => {
      const unitPrice = Number(item.price);
      const origPrice = item.originalPrice ? Number(item.originalPrice) : unitPrice;
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;
      totalQuantity += item.quantity;
      if (origPrice > unitPrice) {
        savings += (origPrice - unitPrice) * item.quantity;
      }
      return {
        ...item,
        itemSubtotal: formatMoney(itemSubtotal),
      };
    });

    const deliveryFee =
      subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD
        ? 0
        : STANDARD_DELIVERY_FEE;
    const total = subtotal + deliveryFee;

    return {
      items: enriched,
      summary: {
        totalQuantity,
        subtotal: formatMoney(subtotal),
        deliveryFee: formatMoney(deliveryFee),
        freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
        savings: formatMoney(savings),
        total: formatMoney(total),
      },
    };
  }

  app.get('/api/cart', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const cart = await getFormattedCart(req.profile!.id);
      return res.json(cart);
    } catch (error) {
      console.error('Get cart error:', error);
      return res.status(500).json({ error: 'Failed to load shopping cart.' });
    }
  });

  app.post('/api/cart', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const productId = Number(req.body?.productId);
      const quantity = Math.max(1, Number(req.body?.quantity || 1));

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Invalid product ID.' });
      }

      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        return res.status(404).json({ error: 'Product not found.' });
      }

      if (product.stock <= 0) {
        return res.status(400).json({ error: `${product.name} is currently out of stock.` });
      }

      const existing = await db
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.userId, req.profile!.id),
            eq(cartItems.productId, productId)
          )
        )
        .limit(1);

      const newQty = (existing[0]?.quantity ?? 0) + quantity;
      if (newQty > product.stock) {
        return res.status(400).json({
          error: `Only ${product.stock} unit(s) of ${product.name} available in stock.`,
        });
      }

      if (existing.length > 0) {
        await db
          .update(cartItems)
          .set({ quantity: newQty })
          .where(eq(cartItems.id, existing[0].id));
      } else {
        await db.insert(cartItems).values({
          userId: req.profile!.id,
          productId,
          quantity: newQty,
        });
      }

      const cart = await getFormattedCart(req.profile!.id);
      return res.json(cart);
    } catch (error) {
      console.error('Add to cart error:', error);
      return res.status(500).json({ error: 'Failed to add item to cart.' });
    }
  });

  app.post('/api/cart/sync', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const guestItems: Array<{ productId: number; quantity: number }> = Array.isArray(
        req.body?.items
      )
        ? req.body.items
        : [];

      for (const entry of guestItems) {
        const pid = Number(entry.productId);
        const qty = Math.max(1, Number(entry.quantity || 1));
        if (!Number.isInteger(pid) || pid <= 0) continue;

        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, pid))
          .limit(1);
        if (!product || product.stock <= 0) continue;

        const existing = await db
          .select()
          .from(cartItems)
          .where(
            and(eq(cartItems.userId, req.profile!.id), eq(cartItems.productId, pid))
          )
          .limit(1);

        const targetQty = Math.min(product.stock, (existing[0]?.quantity ?? 0) + qty);
        if (existing.length > 0) {
          await db
            .update(cartItems)
            .set({ quantity: targetQty })
            .where(eq(cartItems.id, existing[0].id));
        } else {
          await db.insert(cartItems).values({
            userId: req.profile!.id,
            productId: pid,
            quantity: targetQty,
          });
        }
      }

      const cart = await getFormattedCart(req.profile!.id);
      return res.json(cart);
    } catch (error) {
      console.error('Sync cart error:', error);
      return res.status(500).json({ error: 'Failed to sync cart.' });
    }
  });

  app.put('/api/cart/:productId', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const productId = Number(req.params.productId);
      const quantity = Number(req.body?.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Invalid product ID.' });
      }

      if (!Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ error: 'Invalid quantity.' });
      }

      if (quantity === 0) {
        await db
          .delete(cartItems)
          .where(
            and(
              eq(cartItems.userId, req.profile!.id),
              eq(cartItems.productId, productId)
            )
          );
        const cart = await getFormattedCart(req.profile!.id);
        return res.json(cart);
      }

      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        return res.status(404).json({ error: 'Product not found.' });
      }

      if (quantity > product.stock) {
        return res.status(400).json({
          error: `Only ${product.stock} unit(s) available in stock.`,
        });
      }

      await db
        .update(cartItems)
        .set({ quantity })
        .where(
          and(
            eq(cartItems.userId, req.profile!.id),
            eq(cartItems.productId, productId)
          )
        );

      const cart = await getFormattedCart(req.profile!.id);
      return res.json(cart);
    } catch (error) {
      console.error('Update cart quantity error:', error);
      return res.status(500).json({ error: 'Failed to update quantity.' });
    }
  });

  app.delete('/api/cart/:productId', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const productId = Number(req.params.productId);
      await db
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.userId, req.profile!.id),
            eq(cartItems.productId, productId)
          )
        );
      const cart = await getFormattedCart(req.profile!.id);
      return res.json(cart);
    } catch (error) {
      console.error('Remove cart item error:', error);
      return res.status(500).json({ error: 'Failed to remove item.' });
    }
  });

  app.delete('/api/cart', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      await db.delete(cartItems).where(eq(cartItems.userId, req.profile!.id));
      const cart = await getFormattedCart(req.profile!.id);
      return res.json(cart);
    } catch (error) {
      console.error('Clear cart error:', error);
      return res.status(500).json({ error: 'Failed to clear cart.' });
    }
  });

  // ---------------------------------------------------------------------------
  // ADDRESS MANAGEMENT ROUTES
  // ---------------------------------------------------------------------------

  const addressSchema = z.object({
    fullName: z.string().trim().min(2, 'Recipient name is required'),
    phone: z.string().trim().min(7, 'Valid phone number is required'),
    houseNumber: z.string().trim().min(1, 'House / flat number is required'),
    address: z.string().trim().min(4, 'Street address is required'),
    city: z.string().trim().min(2, 'City is required'),
    state: z.string().trim().min(2, 'State is required'),
    postalCode: z.string().trim().min(3, 'Postal code is required'),
    isDefault: z.boolean().optional(),
  });

  app.get('/api/addresses', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const rows = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, req.profile!.id))
        .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
      return res.json({ addresses: rows });
    } catch (error) {
      console.error('Fetch addresses error:', error);
      return res.status(500).json({ error: 'Failed to load saved addresses.' });
    }
  });

  app.post('/api/addresses', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const parsed = addressSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message || 'Invalid address.' });
      }

      if (parsed.data.isDefault) {
        await db
          .update(addresses)
          .set({ isDefault: false })
          .where(eq(addresses.userId, req.profile!.id));
      }

      const [created] = await db
        .insert(addresses)
        .values({
          userId: req.profile!.id,
          ...parsed.data,
          isDefault: parsed.data.isDefault ?? false,
        })
        .returning();

      return res.status(201).json({ address: created });
    } catch (error) {
      console.error('Create address error:', error);
      return res.status(500).json({ error: 'Failed to save address.' });
    }
  });

  app.delete('/api/addresses/:id', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db
        .delete(addresses)
        .where(and(eq(addresses.id, id), eq(addresses.userId, req.profile!.id)));
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete address error:', error);
      return res.status(500).json({ error: 'Failed to remove address.' });
    }
  });

  // ---------------------------------------------------------------------------
  // ORDER PLACEMENT & TRACKING ROUTES
  // ---------------------------------------------------------------------------

  const checkoutSchema = z.object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    email: z.string().trim().email('Valid email is required'),
    phone: z.string().trim().min(7, 'Phone number is required'),
    houseNumber: z.string().trim().min(1, 'House / apartment number is required'),
    streetAddress: z.string().trim().min(4, 'Street address is required'),
    city: z.string().trim().min(2, 'City is required'),
    state: z.string().trim().min(2, 'State is required'),
    postalCode: z.string().trim().min(3, 'Postal code is required'),
    deliveryInstructions: z.string().trim().max(300).optional(),
    paymentMethod: z.enum(['cash_on_delivery', 'online_test_pending']),
    saveAddress: z.boolean().optional(),
    promoCode: z.string().trim().optional(),
  });

  app.post('/api/orders', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message || 'Invalid checkout details.' });
      }

      const data = parsed.data;
      const userId = req.profile!.id;

      // Atomic transaction: verify cart, compute prices from DB, decrement stock safely, create order & items, clear cart
      const createdOrder = await db.transaction(async (tx) => {
        const userCart = await tx
          .select({
            cartId: cartItems.id,
            productId: cartItems.productId,
            quantity: cartItems.quantity,
            name: products.name,
            price: products.price,
            originalPrice: products.originalPrice,
            imageUrl: products.imageUrl,
            stock: products.stock,
          })
          .from(cartItems)
          .innerJoin(products, eq(cartItems.productId, products.id))
          .where(eq(cartItems.userId, userId));

        if (userCart.length === 0) {
          throw new Error('EMPTY_CART');
        }

        let subtotalNum = 0;
        const verifiedItems: Array<{
          productId: number;
          productName: string;
          productImage: string;
          price: string;
          quantity: number;
          subtotal: string;
        }> = [];

        for (const item of userCart) {
          if (item.quantity <= 0) {
            throw new Error(`INVALID_QTY:${item.name}`);
          }

          // Atomic stock decrement preventing race condition / overselling
          const decremented = await tx
            .update(products)
            .set({
              stock: sql`${products.stock} - ${item.quantity}`,
              salesCount: sql`${products.salesCount} + ${item.quantity}`,
            })
            .where(
              and(
                eq(products.id, item.productId),
                gte(products.stock, item.quantity)
              )
            )
            .returning({ id: products.id });

          if (decremented.length === 0) {
            throw new Error(`OUT_OF_STOCK:${item.name}`);
          }

          const unitPrice = Number(item.price);
          const lineTotal = unitPrice * item.quantity;
          subtotalNum += lineTotal;

          verifiedItems.push({
            productId: item.productId,
            productName: item.name,
            productImage: item.imageUrl,
            price: formatMoney(unitPrice),
            quantity: item.quantity,
            subtotal: formatMoney(lineTotal),
          });
        }

        const deliveryFeeNum =
          subtotalNum >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;

        let discountNum = 0;
        if (data.promoCode && data.promoCode.toUpperCase() === 'FRESH10') {
          discountNum = Math.min(subtotalNum * 0.1, 15);
        }

        const totalNum = Math.max(0, subtotalNum + deliveryFeeNum - discountNum);

        let addressId: number | null = null;
        if (data.saveAddress) {
          const [savedAddr] = await tx
            .insert(addresses)
            .values({
              userId,
              fullName: data.fullName,
              phone: data.phone,
              houseNumber: data.houseNumber,
              address: data.streetAddress,
              city: data.city,
              state: data.state,
              postalCode: data.postalCode,
              isDefault: false,
            })
            .returning({ id: addresses.id });
          addressId = savedAddr.id;
        }

        const orderNumber = `FC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto
          .randomBytes(3)
          .toString('hex')
          .toUpperCase()}`;

        const shippingSnapshot = JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          houseNumber: data.houseNumber,
          streetAddress: data.streetAddress,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
        });

        const [order] = await tx
          .insert(orders)
          .values({
            orderNumber,
            userId,
            addressId,
            shippingSnapshot,
            subtotal: formatMoney(subtotalNum),
            deliveryFee: formatMoney(deliveryFeeNum),
            discount: formatMoney(discountNum),
            totalAmount: formatMoney(totalNum),
            paymentMethod: data.paymentMethod,
            paymentStatus: 'pending',
            orderStatus: 'pending',
            deliveryInstructions: data.deliveryInstructions || '',
          })
          .returning();

        const insertedItems = await tx
          .insert(orderItems)
          .values(
            verifiedItems.map((vi) => ({
              orderId: order.id,
              ...vi,
            }))
          )
          .returning();

        await tx.delete(cartItems).where(eq(cartItems.userId, userId));

        return {
          ...order,
          shippingAddress: JSON.parse(order.shippingSnapshot),
          items: insertedItems,
        };
      });

      return res.status(201).json({ order: createdOrder });
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg === 'EMPTY_CART') {
        return res.status(400).json({ error: 'Your shopping cart is empty.' });
      }
      if (msg.startsWith('OUT_OF_STOCK:')) {
        const name = msg.split(':')[1];
        return res.status(409).json({
          error: `Insufficient stock for "${name}". Please adjust quantity in your cart.`,
        });
      }
      console.error('Order placement error:', error);
      return res.status(500).json({ error: 'Failed to place order. Please try again.' });
    }
  });

  app.get('/api/orders', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const userOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, req.profile!.id))
        .orderBy(desc(orders.createdAt));

      const hydrated = await Promise.all(
        userOrders.map(async (order) => {
          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));
          return {
            ...order,
            shippingAddress: JSON.parse(order.shippingSnapshot),
            items,
          };
        })
      );

      return res.json({ orders: hydrated });
    } catch (error) {
      console.error('Fetch user orders error:', error);
      return res.status(500).json({ error: 'Failed to load orders.' });
    }
  });

  app.get('/api/orders/:id', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const rows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.userId, req.profile!.id)))
        .limit(1);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, rows[0].id));

      return res.json({
        order: {
          ...rows[0],
          shippingAddress: JSON.parse(rows[0].shippingSnapshot),
          items,
        },
      });
    } catch (error) {
      console.error('Fetch single order error:', error);
      return res.status(500).json({ error: 'Failed to load order details.' });
    }
  });

  app.post('/api/orders/:id/cancel', requireAuth, requireVerified, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(orders)
          .where(and(eq(orders.id, id), eq(orders.userId, req.profile!.id)))
          .limit(1);

        if (rows.length === 0) {
          throw new Error('NOT_FOUND');
        }

        const order = rows[0];
        if (!['pending', 'confirmed'].includes(order.orderStatus)) {
          throw new Error('CANNOT_CANCEL');
        }

        const items = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));

        for (const item of items) {
          if (item.productId) {
            await tx
              .update(products)
              .set({
                stock: sql`${products.stock} + ${item.quantity}`,
                salesCount: sql`GREATEST(0, ${products.salesCount} - ${item.quantity})`,
              })
              .where(eq(products.id, item.productId));
          }
        }

        const [cancelled] = await tx
          .update(orders)
          .set({ orderStatus: 'cancelled' })
          .where(eq(orders.id, order.id))
          .returning();

        return {
          ...cancelled,
          shippingAddress: JSON.parse(cancelled.shippingSnapshot),
          items,
        };
      });

      return res.json({ order: updated });
    } catch (error: any) {
      if (error?.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Order not found.' });
      }
      if (error?.message === 'CANNOT_CANCEL') {
        return res.status(400).json({
          error: 'Only pending or confirmed orders can be cancelled.',
        });
      }
      console.error('Cancel order error:', error);
      return res.status(500).json({ error: 'Failed to cancel order.' });
    }
  });

  // ---------------------------------------------------------------------------
  // ADMINISTRATOR ROUTES (STRICTLY BACKEND ROLE-PROTECTED)
  // ---------------------------------------------------------------------------

  app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const [{ totalProducts }] = await db
        .select({ totalProducts: sql<number>`cast(count(*) as int)` })
        .from(products);

      const [{ totalCustomers }] = await db
        .select({ totalCustomers: sql<number>`cast(count(*) as int)` })
        .from(profiles)
        .where(eq(profiles.role, 'customer'));

      const [{ totalOrders }] = await db
        .select({ totalOrders: sql<number>`cast(count(*) as int)` })
        .from(orders);

      const [{ pendingOrders }] = await db
        .select({ pendingOrders: sql<number>`cast(count(*) as int)` })
        .from(orders)
        .where(eq(orders.orderStatus, 'pending'));

      const [{ totalRevenue }] = await db
        .select({
          totalRevenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)::text`,
        })
        .from(orders)
        .where(sql`${orders.orderStatus} != 'cancelled'`);

      const recentOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalAmount: orders.totalAmount,
          orderStatus: orders.orderStatus,
          paymentStatus: orders.paymentStatus,
          paymentMethod: orders.paymentMethod,
          createdAt: orders.createdAt,
          customerName: profiles.fullName,
          customerEmail: profiles.email,
        })
        .from(orders)
        .innerJoin(profiles, eq(orders.userId, profiles.id))
        .orderBy(desc(orders.createdAt))
        .limit(8);

      return res.json({
        stats: {
          totalProducts,
          totalCustomers,
          totalOrders,
          pendingOrders,
          totalRevenue: Number(totalRevenue || 0).toFixed(2),
        },
        recentOrders,
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      return res.status(500).json({ error: 'Failed to load dashboard metrics.' });
    }
  });

  app.post('/api/admin/upload', requireAuth, requireAdmin, async (req, res) => {
    try {
      const dataUrl = String(req.body?.dataUrl || '');
      const filename = String(req.body?.filename || 'product.jpg');
      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
      if (!match) {
        return res.status(400).json({ error: 'Please upload a valid PNG, JPG, or WebP image.' });
      }

      const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
      const buffer = Buffer.from(match[3], 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image size must be 5 MB or smaller.' });
      }

      const safeBase = filename.replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'product';
      const outName = `${safeBase}-${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, outName), buffer);

      return res.json({ imageUrl: `/uploads/${outName}` });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image.' });
    }
  });

  const adminProductSchema = z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(5).max(1000),
    unit: z.string().trim().min(1).max(60),
    price: z.coerce.number().positive(),
    originalPrice: z.coerce.number().positive().nullable().optional(),
    categoryId: z.coerce.number().int().positive(),
    imageUrl: z.string().trim().min(1),
    stock: z.coerce.number().int().min(0),
    isFeatured: z.boolean().optional(),
  });

  app.post('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product data.' });
      }
      const d = parsed.data;
      const [created] = await db
        .insert(products)
        .values({
          name: d.name,
          description: d.description,
          unit: d.unit,
          price: formatMoney(d.price),
          originalPrice: d.originalPrice ? formatMoney(d.originalPrice) : null,
          categoryId: d.categoryId,
          imageUrl: d.imageUrl,
          stock: d.stock,
          isFeatured: d.isFeatured ?? false,
        })
        .returning();

      return res.status(201).json({ product: created });
    } catch (error) {
      console.error('Admin create product error:', error);
      return res.status(500).json({ error: 'Failed to create product.' });
    }
  });

  app.put('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product data.' });
      }
      const d = parsed.data;
      const [updated] = await db
        .update(products)
        .set({
          name: d.name,
          description: d.description,
          unit: d.unit,
          price: formatMoney(d.price),
          originalPrice: d.originalPrice ? formatMoney(d.originalPrice) : null,
          categoryId: d.categoryId,
          imageUrl: d.imageUrl,
          stock: d.stock,
          isFeatured: d.isFeatured ?? false,
        })
        .where(eq(products.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Product not found.' });
      }
      return res.json({ product: updated });
    } catch (error) {
      console.error('Admin update product error:', error);
      return res.status(500).json({ error: 'Failed to update product.' });
    }
  });

  app.delete('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(products).where(eq(products.id, id));
      return res.json({ success: true });
    } catch (error) {
      console.error('Admin delete product error:', error);
      return res.status(500).json({ error: 'Failed to delete product.' });
    }
  });

  app.post('/api/admin/categories', requireAuth, requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().min(3).max(300),
        imageUrl: z.string().trim().min(1),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid category data.' });
      }
      const slug = parsed.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [created] = await db
        .insert(categories)
        .values({
          name: parsed.data.name,
          slug,
          description: parsed.data.description,
          imageUrl: parsed.data.imageUrl,
        })
        .returning();

      return res.status(201).json({ category: created });
    } catch (error) {
      console.error('Admin create category error:', error);
      return res.status(500).json({ error: 'Failed to create category.' });
    }
  });

  app.get('/api/admin/orders', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const allOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          userId: orders.userId,
          shippingSnapshot: orders.shippingSnapshot,
          subtotal: orders.subtotal,
          deliveryFee: orders.deliveryFee,
          discount: orders.discount,
          totalAmount: orders.totalAmount,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          orderStatus: orders.orderStatus,
          deliveryInstructions: orders.deliveryInstructions,
          createdAt: orders.createdAt,
          customerName: profiles.fullName,
          customerEmail: profiles.email,
        })
        .from(orders)
        .innerJoin(profiles, eq(orders.userId, profiles.id))
        .orderBy(desc(orders.createdAt));

      const hydrated = await Promise.all(
        allOrders.map(async (order) => {
          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));
          return {
            ...order,
            shippingAddress: JSON.parse(order.shippingSnapshot),
            items,
          };
        })
      );

      return res.json({ orders: hydrated });
    } catch (error) {
      console.error('Admin fetch orders error:', error);
      return res.status(500).json({ error: 'Failed to load all orders.' });
    }
  });

  app.patch('/api/admin/orders/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const schema = z.object({
        orderStatus: z
          .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
          .optional(),
        paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid status update.' });
      }

      const updateFields: Record<string, string> = {};
      if (parsed.data.orderStatus) updateFields.orderStatus = parsed.data.orderStatus;
      if (parsed.data.paymentStatus) updateFields.paymentStatus = parsed.data.paymentStatus;

      const [updated] = await db
        .update(orders)
        .set(updateFields)
        .where(eq(orders.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      return res.json({ order: updated });
    } catch (error) {
      console.error('Admin update order error:', error);
      return res.status(500).json({ error: 'Failed to update order status.' });
    }
  });

  app.get('/api/admin/customers', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          email: profiles.email,
          phone: profiles.phone,
          role: profiles.role,
          emailVerified: profiles.emailVerified,
          createdAt: profiles.createdAt,
          orderCount: sql<number>`cast(count(${orders.id}) as int)`,
          totalSpent: sql<string>`coalesce(sum(case when ${orders.orderStatus} != 'cancelled' then ${orders.totalAmount} else 0 end), 0)::text`,
        })
        .from(profiles)
        .leftJoin(orders, eq(profiles.id, orders.userId))
        .groupBy(profiles.id)
        .orderBy(desc(profiles.createdAt));

      return res.json({ customers: rows });
    } catch (error) {
      console.error('Admin fetch customers error:', error);
      return res.status(500).json({ error: 'Failed to load customers.' });
    }
  });

  app.get('/api/admin/customers/:id/orders', requireAuth, requireAdmin, async (req, res) => {
    try {
      const customerId = Number(req.params.id);
      const customerOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, customerId))
        .orderBy(desc(orders.createdAt));
      return res.json({ orders: customerOrders });
    } catch (error) {
      console.error('Admin fetch customer orders error:', error);
      return res.status(500).json({ error: 'Failed to load customer order history.' });
    }
  });

  // ---------------------------------------------------------------------------
  // VITE / STATIC SERVING
  // ---------------------------------------------------------------------------

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FreshCart server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
