import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL est obligatoire.');
}

const sessionSecret = process.env.SESSION_SECRET || '';

if (
  nodeEnv === 'production' &&
  (sessionSecret === 'change_me_long_random_string' || sessionSecret.length < 32)
) {
  throw new Error(
    'SESSION_SECRET doit contenir au moins 32 caractères en production et ne peut pas utiliser la valeur par défaut.',
  );
}

const deliveryFeeFcfa = Number.parseInt(
  process.env.DELIVERY_FEE_FCFA || '500',
  10,
);

if (!Number.isInteger(deliveryFeeFcfa) || deliveryFeeFcfa < 0) {
  throw new Error('DELIVERY_FEE_FCFA doit être un entier positif ou nul.');
}

export const config = Object.freeze({
  nodeEnv,
  databaseUrl,
  port: Number.parseInt(process.env.PORT || '3000', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  deliveryFeeFcfa,
  sessionSecret,
});
