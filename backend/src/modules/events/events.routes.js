import { Router } from 'express';
import { invalidateCache, cacheMiddleware } from '../../shared/middleware/cache.js';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';
import { validate, createEventSchema } from '../../shared/middleware/validation.js';
import { adminAuditLog } from '../../shared/middleware/audit.js';

const router = Router();

router.get('/', cacheMiddleware('events:', 30), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { page = 1, limit = 10, upcoming, category, search, date, price } = req.query;

    const where = {};
    
    if (upcoming === 'true') {
      where.date = { gte: new Date() };
    }
    
    if (category && category !== 'all') {
      where.category = category.toUpperCase();
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (date) {
      const now = new Date();
      if (date === 'today') {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        where.date = { ...where.date, gte: now, lte: endOfDay };
      } else if (date === 'week') {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + 7);
        where.date = { ...where.date, gte: now, lte: endOfWeek };
      } else if (date === 'month') {
        const endOfMonth = new Date(now);
        endOfMonth.setMonth(now.getMonth() + 1);
        where.date = { ...where.date, gte: now, lte: endOfMonth };
      }
    }

    let orderBy = { date: 'asc' };
    if (price === 'asc' || price === 'desc') {
      orderBy = { price: price };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy,
        select: {
          id: true, title: true, description: true, date: true,
          location: true, price: true, totalSeats: true,
          availableSeats: true, imageUrl: true, videoUrl: true, category: true
        }
      }),
      prisma.event.count({ where })
    ]);

    res.json({
      events,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', cacheMiddleware('events:', 60), async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, title: true, description: true, date: true,
        location: true, price: true, totalSeats: true,
        availableSeats: true, imageUrl: true, videoUrl: true, category: true, createdAt: true
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireAdmin, adminAuditLog('CREATE_EVENT'), async (req, res, next) => {
  try {
    const { title, description, date, location, price, totalSeats, imageUrl, videoUrl, category } = req.body;
    const prisma = req.app.locals.prisma;

    if (!title || !description || !date || !location || !price || !totalSeats) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const event = await prisma.event.create({
      data: {
        title, description, date: new Date(date), location,
        price: Number(price), totalSeats: Number(totalSeats),
        availableSeats: Number(totalSeats), imageUrl, videoUrl,
        category: category ? category.toUpperCase() : 'CONCERT'
      }
    });

    await invalidateCache('events:*');

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, adminAuditLog('UPDATE_EVENT'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, price, totalSeats, imageUrl, videoUrl, category } = req.body;
    const prisma = req.app.locals.prisma;

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(location && { location }),
        ...(price && { price: Number(price) }),
        ...(totalSeats && { totalSeats: Number(totalSeats) }),
        ...(imageUrl && { imageUrl }),
        ...(videoUrl && { videoUrl }),
        ...(category && { category: category.toUpperCase() })
      }
    });

    await invalidateCache('events:*');

    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, adminAuditLog('DELETE_EVENT'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    await prisma.event.delete({ where: { id } });
    await invalidateCache('events:*');

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
