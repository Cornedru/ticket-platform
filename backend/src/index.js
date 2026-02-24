import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import orderRoutes from './routes/orders.js';
import ticketRoutes from './routes/tickets.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

async function seedDatabase() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@ticket.com' }
    });

    if (!existingAdmin) {
      console.log('🌱 Seeding database...');
      const adminPassword = await bcrypt.hash('admin123', 12);
      await prisma.user.create({
        data: {
          email: 'admin@ticket.com',
          password: adminPassword,
          name: 'Admin',
          role: 'ADMIN'
        }
      });
      console.log('✅ Admin created');

      const events = [
        { title: 'Concert Rock Stars', description: 'Le plus grand concert de rock', date: new Date('2026-06-15T20:00:00'), location: 'Stade de France, Paris', price: 89.99, totalSeats: 5000, availableSeats: 5000 },
        { title: 'Festival de Jazz', description: '3 jours de jazz en plein air', date: new Date('2026-07-20T18:00:00'), location: 'Parc de la Villette, Paris', price: 150.00, totalSeats: 2000, availableSeats: 2000 },
        { title: 'Match de Football', description: 'PSG vs Olympique de Marseille', date: new Date('2026-03-10T21:00:00'), location: 'Parc des Princes, Paris', price: 120.00, totalSeats: 45000, availableSeats: 45000 },
        { title: 'Théâtre: Le Roi Lion', description: 'Comédie musicale Disney', date: new Date('2026-04-05T19:30:00'), location: 'Théâtre Mogador, Paris', price: 95.00, totalSeats: 1800, availableSeats: 1800 },
        { title: 'Conference Tech 2026', description: 'Conférence technologique française', date: new Date('2026-05-22T09:00:00'), location: 'Palais des Congrès, Lyon', price: 299.00, totalSeats: 3000, availableSeats: 3000 }
      ];

      for (const event of events) {
        await prisma.event.create({ data: event });
      }
      console.log('✅ Events created:', events.length);
    } else {
      console.log('✅ Database already seeded');
    }
  } catch (err) {
    console.log('⚠️  Seed check:', err.message);
  }
}

app.locals.prisma = prisma;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', async () => {
  await seedDatabase();
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});
