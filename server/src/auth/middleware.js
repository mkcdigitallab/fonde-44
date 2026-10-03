import { AppError } from '../errors.js';

export async function optionalAuth(req, _res, next) {
  try {
    const { getSessionUser } = await import('./sessions.js');
    req.user = await getSessionUser(req);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new AppError(401, 'Authentification requise.'));
  return next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentification requise.'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'Accès interdit.'));
    return next();
  };
}

export function csrfProtection(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (!req.cookies?.fonde_session) return next();
  if (req.get('origin') === req.app.locals.frontendOrigin) return next();
  return res.status(403).json({ error: 'Origine de requête refusée.' });
}
