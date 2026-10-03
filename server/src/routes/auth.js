import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { createHash, randomBytes } from 'node:crypto';

import { config } from '../config.js';
import { pool, withTransaction } from '../db.js';
import { AppError } from '../errors.js';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { createSession, destroySession, getSessionUser } from '../auth/sessions.js';

const router = Router();
const oauthClient = new OAuth2Client(config.googleClientId || undefined);
const GENERIC_LOGIN_ERROR = 'Identifiants invalides.';
const GENERIC_ACTIVATION_ERROR = 'Code d’activation invalide.';
const DUMMY_PASSWORD_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

const phoneSchema = z.string().regex(/^(?:\+221)?(?:70|75|76|77|78|33)\d{7}$/, 'Numéro sénégalais invalide.').transform(value => value.startsWith('+221') ? value : `+221${value}`);
const registerSchema = z.strictObject({ fullName: z.string().trim().min(2).max(100), email: z.string().trim().email().transform(value => value.toLowerCase()), phone: phoneSchema, password: z.string().min(10).max(128) });
const loginSchema = z.strictObject({ email: z.string().trim().email().transform(value => value.toLowerCase()), password: z.string().min(1).max(128) });
const googleSchema = z.strictObject({ credential: z.string().min(1) });
const activateSchema = z.strictObject({ code: z.string().trim().length(24), fullName: z.string().trim().min(2).max(100), email: z.string().trim().email().transform(value => value.toLowerCase()), phone: phoneSchema, password: z.string().min(12).max(128) });

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: GENERIC_LOGIN_ERROR } });
const activationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: GENERIC_ACTIVATION_ERROR } });

function parseBody(schema, req, res) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides.' }); return null; }
  return parsed.data;
}

function publicUser(user) { return { id: user.id, role: user.role, fullName: user.full_name, email: user.email }; }

router.post('/register', async (req, res, next) => {
  const data = parseBody(registerSchema, req, res); if (!data) return;
  try {
    const passwordHash = await hashPassword(data.password);
    const { rows } = await pool.query(
      'INSERT INTO auth.users (role, email, password_hash, full_name, phone) VALUES (\'client\', $1, $2, $3, $4) RETURNING id, role, full_name, email',
      [data.email, passwordHash, data.fullName, data.phone],
    );
    await createSession(rows[0].id, req, res);
    return res.status(201).json(publicUser(rows[0]));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Un compte existe déjà avec ces informations.' });
    return next(error);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  const data = parseBody(loginSchema, req, res); if (!data) return;
  try {
    const { rows } = await pool.query('SELECT id, role, full_name, email, password_hash, is_active FROM auth.users WHERE lower(email) = $1 LIMIT 1', [data.email]);
    const user = rows[0];
    const valid = user?.password_hash ? await verifyPassword(data.password, user.password_hash) : await verifyPassword(data.password, DUMMY_PASSWORD_HASH);
    if (!user || !valid || !user.is_active) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    await pool.query('UPDATE auth.users SET last_login_at = now() WHERE id = $1', [user.id]);
    await createSession(user.id, req, res);
    return res.status(200).json(publicUser(user));
  } catch (error) { return next(error); }
});

router.post('/google', async (req, res, next) => {
  const data = parseBody(googleSchema, req, res); if (!data) return;
  if (!config.googleClientId) return res.status(503).json({ error: 'Connexion Google indisponible.' });
  try {
    const ticket = await oauthClient.verifyIdToken({ idToken: data.credential, audience: config.googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) return res.status(401).json({ error: 'Compte Google non vérifié.' });
    const email = payload.email.toLowerCase();
    const googleSub = payload.sub;
    let result = await pool.query('SELECT id, role, full_name, email, is_active FROM auth.users WHERE google_sub = $1 LIMIT 1', [googleSub]);
    if (result.rows.length) {
      const user = result.rows[0];
      if (user.role !== 'client') return res.status(403).json({ error: 'Ce compte ne peut pas utiliser Google.' });
      if (!user.is_active) return res.status(403).json({ error: 'Compte inactif.' });
      await pool.query('UPDATE auth.users SET last_login_at = now() WHERE id = $1', [user.id]);
      await createSession(user.id, req, res);
      return res.status(200).json(publicUser(user));
    }
    result = await pool.query('SELECT id, role, full_name, email, is_active FROM auth.users WHERE lower(email) = $1 LIMIT 1', [email]);
    if (result.rows.length) {
      const user = result.rows[0];
      if (user.role !== 'client') return res.status(403).json({ error: 'Ce compte ne peut pas utiliser Google.' });
      if (!user.is_active) return res.status(403).json({ error: 'Compte inactif.' });
      await pool.query('UPDATE auth.users SET google_sub = $1, last_login_at = now() WHERE id = $2', [googleSub, user.id]);
      await createSession(user.id, req, res);
      return res.status(200).json(publicUser(user));
    }
    const { rows } = await pool.query(
      'INSERT INTO auth.users (role, email, google_sub, full_name, phone, last_login_at) VALUES (\'client\', $1, $2, $3, NULL, now()) RETURNING id, role, full_name, email',
      [email, googleSub, payload.name || email.split('@')[0]],
    );
    await createSession(rows[0].id, req, res);
    return res.status(201).json(publicUser(rows[0]));
  } catch (error) { return next(error); }
});

router.post('/activate', activationLimiter, async (req, res, next) => {
  const data = parseBody(activateSchema, req, res); if (!data) return;
  try {
    const user = await withTransaction(async client => {
      const codeHash = createHash('sha256').update(data.code).digest('hex');
      const { rows: codes } = await client.query('SELECT id, role, expires_at, used_at FROM auth.activation_codes WHERE code_hash = $1 FOR UPDATE', [codeHash]);
      const activation = codes[0];
      if (!activation || activation.used_at || new Date(activation.expires_at).getTime() <= Date.now()) throw new AppError(400, GENERIC_ACTIVATION_ERROR);
      const { rows: claimed } = await client.query('UPDATE auth.activation_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id, role', [activation.id]);
      if (claimed.length !== 1) throw new AppError(400, GENERIC_ACTIVATION_ERROR);
      const passwordHash = await hashPassword(data.password);
      const { rows: created } = await client.query(
        'INSERT INTO auth.users (role, email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, role, full_name, email',
        [activation.role, data.email, passwordHash, data.fullName, data.phone],
      );
      await client.query(
        'INSERT INTO admin.audit_log (actor_user_id, action, target, details) VALUES (NULL, \'staff.activated\', $1, $2::jsonb)',
        [created[0].id, JSON.stringify({ role: activation.role, activation_code_id: activation.id })],
      );
      return created[0];
    });
    await createSession(user.id, req, res);
    return res.status(201).json(publicUser(user));
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error.code === '23505') return res.status(409).json({ error: 'Ce compte existe déjà.' });
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try { await destroySession(req, res); return res.status(204).send(); } catch (error) { return next(error); }
});

router.get('/me', async (req, res, next) => {
  try { const user = await getSessionUser(req); if (!user) return res.status(401).json({ error: 'Authentification requise.' }); return res.status(200).json(user); }
  catch (error) { return next(error); }
});

export default router;