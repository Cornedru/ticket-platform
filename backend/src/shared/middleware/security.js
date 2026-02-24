import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

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

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", process.env.API_URL || 'http://localhost:3000'],
      }
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
      : ['http://localhost:3000', 'http://localhost:5173'],
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
