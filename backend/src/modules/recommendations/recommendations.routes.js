import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const userOrders = await prisma.order.findMany({
      where: { userId, status: 'PAID' },
      include: { event: true }
    });

    if (userOrders.length === 0) {
      const popularEvents = await prisma.event.findMany({
        where: { date: { gte: new Date() } },
        orderBy: { availableSeats: 'asc' },
        take: 3,
        select: {
          id: true, title: true, description: true, date: true,
          location: true, price: true, totalSeats: true,
          availableSeats: true, imageUrl: true, videoUrl: true
        }
      });

      return res.json({ events: popularEvents, fallback: true });
    }

    const locations = [...new Set(userOrders.map(o => o.event.location.split(',').pop().trim()))];
    const avgPrice = userOrders.reduce((sum, o) => sum + o.event.price, 0) / userOrders.length;

    const allEvents = await prisma.event.findMany({
      where: { 
        date: { gte: new Date() },
        id: { notIn: userOrders.map(o => o.eventId) }
      }
    });

    const scoredEvents = allEvents.map(event => {
      const eventLocation = event.location.split(',').pop().trim();
      const locationScore = locations.includes(eventLocation) ? 1 : 0.3;

      const priceDiff = Math.abs(event.price - avgPrice) / avgPrice;
      const priceScore = Math.max(0, 1 - priceDiff);

      const popularity = (event.totalSeats - event.availableSeats) / event.totalSeats;

      const daysUntil = Math.max(0, (new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
      const dateScore = daysUntil <= 30 ? 1 - (daysUntil / 30) : 0;

      const score = (locationScore * 0.4) + (priceScore * 0.3) + (popularity * 0.2) + (dateScore * 0.1);

      return { event, score: Math.round(score * 100) };
    });

    scoredEvents.sort((a, b) => b.score - a.score);

    const recommendations = scoredEvents.slice(0, 3).map(({ event, score }) => ({
      ...event,
      matchScore: score
    }));

    res.json({ events: recommendations, fallback: false });
  } catch (err) {
    next(err);
  }
});

export default router;
