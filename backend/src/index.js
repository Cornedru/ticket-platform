import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import authRoutes from './modules/auth/auth.routes.js';
import eventRoutes from './modules/events/events.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import ticketRoutes from './modules/tickets/tickets.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import waitlistRoutes from './modules/waitlist/waitlist.routes.js';
import recommendationsRoutes from './modules/recommendations/recommendations.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { rateLimiters } from './shared/middleware/security.js';
import { redis } from './shared/middleware/cache.js';
import logger from './shared/logger.js';
import passport from './shared/passport.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.locals.prisma = prisma;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://assets.mixkit.co", "https://*.mixkit.co", "https://*.youtube.com", "https://*.ytimg.com", "https://i.ytimg.com"],
      mediaSrc: ["'self'", "https://assets.mixkit.co", "https://*.mixkit.co", "https://*.youtube.com", "https://*.ytimg.com"],
      connectSrc: ["'self'", "http://localhost:8081", "https://localhost:8443"],
      manifestSrc: ["'self'", "/manifest.json"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://player.vimeo.com"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',')
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081', 'https://localhost:8443'],
  credentials: true
}));

app.use(passport.initialize());

app.use(express.json());

app.use('/api', rateLimiters.api);
app.use('/api/v1/auth', rateLimiters.auth);
app.use('/api/v1/orders', rateLimiters.payment);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/recommendations', recommendationsRoutes);
app.use('/api/v1/admin/analytics', analyticsRoutes);

app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok';
  let redisStatus = 'ok';
  
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }
  
  if (redis) {
    try {
      await redis.ping();
    } catch {
      redisStatus = 'error';
    }
  } else {
    redisStatus = 'disabled';
  }
  
  res.json({ 
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: { db: dbStatus, redis: redisStatus }
  });
});

app.use(errorHandler);

async function seedDatabase() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@ticket.com' }
    });

    if (!existingAdmin) {
      logger.info('Seeding database...');
      const adminPassword = await bcrypt.hash('admin123', 12);
      await prisma.user.create({
        data: {
          email: 'admin@ticket.com',
          password: adminPassword,
          name: 'Admin',
          role: 'ADMIN'
        }
      });
      logger.info('Admin created');

      const events = [
        { title: 'Concert Rock Stars', description: 'Le plus grand concert de rock', date: new Date('2026-06-15T20:00:00'), location: 'Stade de France, Paris', price: 89.99, totalSeats: 5000, availableSeats: 5000, videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-concert-crowd-cheering-and-flashing-lights-4399-large.mp4', category: 'CONCERT' },
        { title: 'Festival de Jazz', description: '3 jours de jazz en plein air', date: new Date('2026-07-20T18:00:00'), location: 'Parc de la Villette, Paris', price: 150.00, totalSeats: 2000, availableSeats: 2000, videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-dj-playing-music-in-a-club-4038-large.mp4', category: 'FESTIVAL' },
        { title: 'Match de Football', description: 'PSG vs Olympique de Marseille', date: new Date('2026-03-10T21:00:00'), location: 'Parc des Princes, Paris', price: 120.00, totalSeats: 45000, availableSeats: 45000, videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-football-stadium-crowd-watching-the-game-4554-large.mp4', category: 'SPORT' },
        { title: 'Théâtre: Le Roi Lion', description: 'Comédie musicale Disney', date: new Date('2026-04-05T19:30:00'), location: 'Théâtre Mogador, Paris', price: 95.00, totalSeats: 1800, availableSeats: 1800, videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-spotlights-moving-on-a-stage-32795-large.mp4', category: 'THEATRE' },
        { title: 'Conference Tech 2026', description: 'Conférence technologique française', date: new Date('2026-05-22T09:00:00'), location: 'Palais des Congrès, Lyon', price: 299.00, totalSeats: 3000, availableSeats: 3000, videoUrl: 'https://assets.mixkit.co/mixkit-people/videos/preview-working-in-a-technology-company-4816-large.mp4', category: 'CONFERENCE' },
        { title: 'Spectacle d Humour', description: 'Soirée comedy avec les meilleurs humoristes', date: new Date('2026-04-20T20:30:00'), location: 'Comedy Club, Paris', price: 35.00, totalSeats: 500, availableSeats: 500, category: 'HUMOUR' }
      ];

      for (const event of events) {
        await prisma.event.create({ data: event });
      }
      logger.info({ eventsCount: events.length }, 'Events created');
    } else {
      logger.info('Database already seeded');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Seed check failed');
  }
}

const server = app.listen(PORT, '0.0.0.0', async () => {
  await seedDatabase();
  logger.info({ port: PORT }, 'Server started');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});
