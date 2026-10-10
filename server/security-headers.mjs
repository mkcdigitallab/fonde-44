const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://nominatim.openstreetmap.org https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), geolocation=(self), microphone=(self)",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
});

export function securityHeaders(_req, res, next) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
  next();
}
