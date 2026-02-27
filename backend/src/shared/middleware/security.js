import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import crypto from 'crypto';

const createRateLimiter = (windowMs, max, keyGenerator = null) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: keyGenerator || ((req) => req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health',
    handler: (req, res) => {
      res.status(429).json({
        error: 'Trop de requêtes, veuillez réessayer plus tard.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

export const generateNonce = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  next();
};

const getCSPDirectives = (req, res) => {
  const nonce = res.locals.nonce || '';
  return {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", `'nonce-${nonce}'`, 'https://js.stripe.com'],
    styleSrc: ["'self'", `'nonce-${nonce}'`, 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
    mediaSrc: ["'self'", "blob:", "https:"],
    connectSrc: ["'self'", "https://api.stripe.com", "https://events.stripe.com"],
    frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"]
  };
};

export const securityMiddleware = [
  generateNonce,
  helmet({
    contentSecurityPolicy: {
      directives: getCSPDirectives
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  cors({
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS || '').split(',')
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
];

export const rateLimiters = {
  auth: createRateLimiter(15 * 60 * 1000, 50),
  api: createRateLimiter(15 * 60 * 1000, 200),
  payment: createRateLimiter(1 * 60 * 1000, 10),
  strict: createRateLimiter(1 * 60 * 1000, 5)
};
