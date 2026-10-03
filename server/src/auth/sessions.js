import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { pool } from '../db.js';

const COOKIE_NAME = 'fonde_session';
const CLIENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STAFF_TTL_MS = 12 * 60 * 60 * 1000;

export function hashToken(token) { return createHash('sha256').update(token).digest('hex'); }

function cookieOptions(maxAge) {
  return { httpOnly: true, sameSite: 'lax', path: '/', secure: config.nodeEnv === 'production', maxAge };
}

export async function createSession(userId, req, res) {
  const { rows } = await pool.query('SELECT role, is_active FROM auth.users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user || !user.is_active) throw new Error('Utilisateur introuvable ou inactif.');
  const token = randomBytes(32).toString('base64url');
  const ttl = user.role === 'client' ? CLIENT_TTL_MS : STAFF_TTL_MS;
  await pool.query(
    'INSERT INTO auth.sessions (user_id, token_hash, expires_at, ip, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [userId, hashToken(token), new Date(Date.now() + ttl), req.ip || null, req.get?.('user-agent') || null],
  );
  res.cookie(COOKIE_NAME, token, cookieOptions(ttl));
  return token;
}

export async function destroySession(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) await pool.query('DELETE FROM auth.sessions WHERE token_hash = $1', [hashToken(token)]);
  res.clearCookie(COOKIE_NAME, cookieOptions(0));
}

export async function getSessionUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  const { rows } = await pool.query(
    'SELECT u.id, u.role, u.full_name, u.email, u.is_active FROM auth.sessions s JOIN auth.users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()',
    [hashToken(token)],
  );
  if (rows.length !== 1 || !rows[0].is_active) {
    await pool.query('DELETE FROM auth.sessions WHERE token_hash = $1', [hashToken(token)]);
    return null;
  }
  return { id: rows[0].id, role: rows[0].role, fullName: rows[0].full_name, email: rows[0].email };
}

export { COOKIE_NAME };