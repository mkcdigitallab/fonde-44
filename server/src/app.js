import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { config } from './config.js';
import { AppError } from './errors.js';
import { csrfProtection, optionalAuth } from './auth/middleware.js';
import authRoutes from './routes/auth.js';
import { pool, withTransaction } from './db.js';
import {
  computeTotals,
  countPots,
  validateDelivery,
} from './domain/orderRules.js';

const senegalPhoneSchema = z
  .string()
  .regex(
    /^(?:\+221)?(?:70|75|76|77|78|33)\d{7}$/,
    'Numéro sénégalais invalide.',
  )
  .transform((value) => (value.startsWith('+221') ? value : `+221${value}`));

const orderItemSchema = z.strictObject({
  slug: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(50),
});

const orderSchema = z
  .strictObject({
    customerName: z.string().trim().min(2).max(100),
    customerPhone: senegalPhoneSchema,
    deliveryMode: z.enum(['delivery', 'pickup']),
    deliveryAddress: z.string().trim().min(5).max(300).optional(),
    paymentMethod: z.enum(['cash', 'wave', 'orange_money']),
    items: z.array(orderItemSchema).min(1).max(20),
    scheduledFor: z
      .string()
      .datetime({ offset: true })
      .refine(
        (value) => new Date(value).getTime() > Date.now(),
        'La date programmée doit être strictement dans le futur.',
      )
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.deliveryMode === 'delivery' && !value.deliveryAddress) {
      context.addIssue({
        code: 'custom',
        path: ['deliveryAddress'],
        message: 'L’adresse de livraison est obligatoire.',
      });
    }
  });

const app = express();
app.locals.frontendOrigin = config.frontendOrigin;

app.use(helmet());
app.use(
  cors({
    origin: config.frontendOrigin,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(csrfProtection);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[api] health check failed', error);
    return res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/auth', authRoutes);

app.get('/api/products', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, name, description, price_fcfa, unit
       FROM catalog.products
       WHERE is_available = true
       ORDER BY name ASC`,
    );
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', optionalAuth, async (req, res, next) => {
  const parsed = orderSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Données de commande invalides.',
      details: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }

  try {
    const result = await withTransaction(async (client) => {
      const slugs = [...new Set(parsed.data.items.map((item) => item.slug))];
      const { rows: products } = await client.query(
        `SELECT id, slug, name, price_fcfa, unit
         FROM catalog.products
         WHERE slug = ANY($1::text[])
           AND is_available = true`,
        [slugs],
      );

      if (products.length !== slugs.length) {
        throw new AppError(
          422,
          'Un ou plusieurs produits sont inconnus ou indisponibles.',
        );
      }

      const productBySlug = new Map(
        products.map((product) => [product.slug, product]),
      );
      const items = parsed.data.items.map((item) => {
        const product = productBySlug.get(item.slug);

        return {
          product_id: product.id,
          product_name: product.name,
          price_fcfa: product.price_fcfa,
          unit: product.unit,
          quantity: item.quantity,
        };
      });

      try {
        validateDelivery(parsed.data.deliveryMode, countPots(items));
      } catch (error) {
        throw new AppError(422, error.message);
      }

      const totals = computeTotals(
        items,
        parsed.data.deliveryMode,
        config.deliveryFeeFcfa,
      );

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders.orders (
           customer_name,
           customer_phone,
           customer_user_id,
           delivery_mode,
           delivery_address,
           status,
           subtotal_fcfa,
           delivery_fee_fcfa,
           total_fcfa,
           scheduled_for
         )
         VALUES ($1, $2, $3, $4, $5, 'new', $6, $7, $8, $9)
         RETURNING id, reference, status, subtotal_fcfa, delivery_fee_fcfa, total_fcfa`,
        [
          parsed.data.customerName,
          parsed.data.customerPhone,
          req.user?.role === 'client' ? req.user.id : null,
          parsed.data.deliveryMode,
          parsed.data.deliveryAddress || null,
          totals.subtotal,
          totals.delivery_fee,
          totals.total,
          parsed.data.scheduledFor || null,
        ],
      );

      const order = orderRows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO orders.order_items (
             order_id,
             product_id,
             product_name,
             unit_price_fcfa,
             quantity,
             line_total_fcfa
           )
           VALUES ($1, $2, $3, $4, $5, $4 * $5)`,
          [
            order.id,
            item.product_id,
            item.product_name,
            item.price_fcfa,
            item.quantity,
          ],
        );
      }

      const { rows: paymentRows } = await client.query(
        `INSERT INTO orders.payments (order_id, method, status, amount_fcfa)
         VALUES ($1, $2, 'pending', $3)
         RETURNING id`,
        [order.id, parsed.data.paymentMethod, totals.total],
      );

      if (paymentRows.length !== 1) {
        throw new Error('Le paiement n’a pas pu être créé.');
      }

      return {
        reference: order.reference,
        status: order.status,
        subtotal_fcfa: order.subtotal_fcfa,
        delivery_fee_fcfa: order.delivery_fee_fcfa,
        total_fcfa: order.total_fcfa,
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error('[api] erreur interne', error);
  return res.status(500).json({ error: 'Une erreur interne est survenue.' });
});

export { app };
export default app;
