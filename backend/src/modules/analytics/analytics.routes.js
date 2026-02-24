import { Router } from 'express';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';

const router = Router();

router.get('/overview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [orders, totalOrders, revenueResult] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'PAID', createdAt: { gte: startDate } },
        select: { totalPrice: true, quantity: true, eventId: true }
      }),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { totalPrice: true }
      })
    ]);

    const totalRevenue = revenueResult._sum.totalPrice || 0;
    const totalTickets = orders.reduce((sum, o) => sum + o.quantity, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const revenueByDay = {};
    orders.forEach(order => {
      const day = order.createdAt?.toISOString().split('T')[0] || 'unknown';
      revenueByDay[day] = (revenueByDay[day] || 0) + order.totalPrice;
    });

    const topEventResult = await prisma.order.groupBy({
      by: ['eventId'],
      where: { status: 'PAID' },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 1
    });

    let topEvent = null;
    if (topEventResult.length > 0) {
      const event = await prisma.event.findUnique({
        where: { id: topEventResult[0].eventId },
        select: { title: true }
      });
      topEvent = { title: event?.title, revenue: topEventResult[0]._sum.totalPrice };
    }

    res.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      totalTickets,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      topEvent,
      revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue }))
    });
  } catch (err) {
    next(err);
  }
});

router.get('/events/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const orders = await prisma.order.findMany({
      where: { eventId: id, status: 'PAID' },
      select: { totalPrice: true, quantity: true, createdAt: true }
    });

    const revenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const ticketsSold = orders.reduce((sum, o) => sum + o.quantity, 0);
    const conversionRate = event.totalSeats > 0 ? ticketsSold / event.totalSeats : 0;

    res.json({
      event: { id: event.id, title: event.title, date: event.date },
      revenue,
      ticketsSold,
      availableSeats: event.availableSeats,
      conversionRate: Math.round(conversionRate * 100) / 100,
      salesByDay: orders.reduce((acc, o) => {
        const day = o.createdAt?.toISOString().split('T')[0];
        if (day) acc[day] = (acc[day] || 0) + o.quantity;
        return acc;
      }, {})
    });
  } catch (err) {
    next(err);
  }
});

router.get('/revenue', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const periods = [7, 30, 90];
    
    const result = {};
    
    for (const days of periods) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const agg = await prisma.order.aggregate({
        where: { status: 'PAID', createdAt: { gte: startDate } },
        _sum: { totalPrice: true },
        _count: true
      });
      
      result[`${days}days`] = {
        revenue: agg._sum.totalPrice || 0,
        orders: agg._count
      };
    }
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
