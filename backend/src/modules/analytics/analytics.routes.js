import { Router } from 'express';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';

const router = Router();

router.get('/overview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);
    const now = new Date();

    const startCurrent = new Date(now);
    startCurrent.setDate(now.getDate() - daysInt);
    const startPrev = new Date(now);
    startPrev.setDate(now.getDate() - daysInt * 2);

    const [
      currentOrders,
      prevOrders,
      totalOrdersAll,
      revenueAll,
      allEvents,
      ticketTransfers,
      totalTickets,
      activeUsersCurrent,
      activeUsersPrev,
      totalUsers,
      waitlistCount,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'PAID', createdAt: { gte: startCurrent } },
        select: { totalPrice: true, quantity: true, eventId: true, createdAt: true, userId: true },
      }),
      prisma.order.findMany({
        where: { status: 'PAID', createdAt: { gte: startPrev, lt: startCurrent } },
        select: { totalPrice: true, quantity: true, userId: true },
      }),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { totalPrice: true } }),
      prisma.event.findMany({
        select: { id: true, title: true, totalSeats: true, availableSeats: true, date: true },
      }),
      prisma.ticket.count({ where: { transferredAt: { not: null } } }),
      prisma.ticket.count(),
      prisma.user.count({ where: { 
        orders: { some: { createdAt: { gte: startCurrent } } }
      }}),
      prisma.user.count({ where: { 
        orders: { some: { createdAt: { gte: startPrev, lt: startCurrent } } }
      }}),
      prisma.user.count(),
      prisma.waitlistEntry.count({ where: { event: { date: { gt: new Date() } } } }),
    ]);

    const currentRevenue = currentOrders.reduce((s, o) => s + o.totalPrice, 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + o.totalPrice, 0);
    const currentTickets = currentOrders.reduce((s, o) => s + o.quantity, 0);
    const prevTickets = prevOrders.reduce((s, o) => s + o.quantity, 0);
    const trend = (curr, prev) =>
      prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

    const revenueByDay = {};
    const ordersByDay = {};
    const ticketsByDate = {};
    for (let i = daysInt - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      revenueByDay[key] = 0;
      ordersByDay[key] = 0;
      ticketsByDate[key] = 0;
    }
    currentOrders.forEach((o) => {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (key in revenueByDay) {
        revenueByDay[key] += o.totalPrice;
        ordersByDay[key] += 1;
        ticketsByDate[key] += o.quantity;
      }
    });

    const revenueByEvent = {};
    const ticketsByEvent = {};
    currentOrders.forEach((o) => {
      revenueByEvent[o.eventId] = (revenueByEvent[o.eventId] || 0) + o.totalPrice;
      ticketsByEvent[o.eventId] = (ticketsByEvent[o.eventId] || 0) + o.quantity;
    });

    const topEvents = Object.entries(revenueByEvent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([eventId, revenue]) => {
        const event = allEvents.find((e) => e.id === eventId);
        const sold = event ? event.totalSeats - event.availableSeats : 0;
        const conversionRate =
          event && event.totalSeats > 0
            ? Math.round((sold / event.totalSeats) * 100)
            : 0;
        return {
          id: eventId,
          title: event?.title || 'Unknown',
          revenue: Math.round(revenue * 100) / 100,
          ticketsSold: ticketsByEvent[eventId] || 0,
          conversionRate,
          totalSeats: event?.totalSeats || 0,
          availableSeats: event?.availableSeats || 0,
        };
      });

    const totalSeats = allEvents.reduce((s, e) => s + e.totalSeats, 0);
    const totalSold = allEvents.reduce((s, e) => s + (e.totalSeats - e.availableSeats), 0);
    const globalConversionRate = totalSeats > 0 ? Math.round((totalSold / totalSeats) * 100) : 0;

    const transferRate =
      totalTickets > 0 ? Math.round((ticketTransfers / totalTickets) * 100) : 0;

    const avgOrderValue =
      currentOrders.length > 0
        ? Math.round((currentRevenue / currentOrders.length) * 100) / 100
        : 0;
    const prevAvgOrderValue =
      prevOrders.length > 0
        ? Math.round(
            (prevRevenue / prevOrders.length) * 100
          ) / 100
        : 0;

    res.json({
      kpis: {
        revenue: {
          current: Math.round(currentRevenue * 100) / 100,
          trend: trend(currentRevenue, prevRevenue),
          total: Math.round((revenueAll._sum.totalPrice || 0) * 100) / 100,
        },
        orders: {
          current: currentOrders.length,
          trend: trend(currentOrders.length, prevOrders.length),
          total: totalOrdersAll,
        },
        tickets: {
          current: currentTickets,
          trend: trend(currentTickets, prevTickets),
          total: totalTickets,
        },
        avgOrderValue: {
          current: avgOrderValue,
          trend: trend(avgOrderValue, prevAvgOrderValue),
        },
        activeUsers: {
          current: activeUsersCurrent,
          trend: trend(activeUsersCurrent, activeUsersPrev),
          total: totalUsers,
        },
        conversionRate: {
          global: globalConversionRate,
        },
        transfers: {
          count: ticketTransfers,
          rate: transferRate,
        },
        waitlist: {
          count: waitlistCount,
        },
      },
      timeSeries: Object.entries(revenueByDay).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
        orders: ordersByDay[date] || 0,
        tickets: ticketsByDate[date] || 0,
      })),
      topEvents,
      period: { days: daysInt, from: startCurrent.toISOString(), to: now.toISOString() },
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
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const orders = await prisma.order.findMany({
      where: { eventId: id, status: 'PAID' },
      select: { totalPrice: true, quantity: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const revenue = orders.reduce((s, o) => s + o.totalPrice, 0);
    const ticketsSold = orders.reduce((s, o) => s + o.quantity, 0);
    const conversionRate =
      event.totalSeats > 0 ? Math.round((ticketsSold / event.totalSeats) * 100) : 0;

    let cumulative = 0;
    const salesVelocity = orders.map((o) => {
      cumulative += o.quantity;
      return {
        date: new Date(o.createdAt).toISOString().split('T')[0],
        tickets: o.quantity,
        cumulative,
        revenue: o.totalPrice,
      };
    });

    const [transferCount, totalEventTickets] = await Promise.all([
      prisma.ticket.count({ where: { eventId: id, transferredAt: { not: null } } }),
      prisma.ticket.count({ where: { eventId: id } }),
    ]);

    res.json({
      event: { id: event.id, title: event.title, date: event.date, location: event.location },
      revenue: Math.round(revenue * 100) / 100,
      ticketsSold,
      availableSeats: event.availableSeats,
      totalSeats: event.totalSeats,
      conversionRate,
      avgOrderValue: orders.length > 0 ? Math.round((revenue / orders.length) * 100) / 100 : 0,
      transfers: { count: transferCount, rate: totalEventTickets > 0 ? Math.round((transferCount / totalEventTickets) * 100) : 0 },
      salesVelocity,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/revenue', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const result = {};

    for (const days of [7, 30, 90]) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const agg = await prisma.order.aggregate({
        where: { status: 'PAID', createdAt: { gte: startDate } },
        _sum: { totalPrice: true },
        _count: true,
      });
      result[`${days}days`] = { revenue: agg._sum.totalPrice || 0, orders: agg._count };
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/export/csv', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { from, to } = req.query;

    const where = { status: 'PAID' };
    if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { title: true, date: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = ['Date,Événement,Date Événement,Lieu,Client,Email,Quantité,Total (€),ID Paiement'];
    const rows = orders.map((o) => {
      const cells = [
        new Date(o.createdAt).toLocaleDateString('fr-FR'),
        `"${o.event.title.replace(/"/g, '""')}"`,
        new Date(o.event.date).toLocaleDateString('fr-FR'),
        `"${o.event.location.replace(/"/g, '""')}"`,
        `"${o.user.name.replace(/"/g, '""')}"`,
        o.user.email,
        o.quantity,
        o.totalPrice.toFixed(2),
        o.paymentId || '',
      ];
      return cells.join(',');
    });

    const csv = [...header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="trip-export-${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
});

router.get('/logs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = [];

    const recentOrders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        user: { select: { name: true } },
        event: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    recentOrders.forEach(order => {
      logs.push({
        type: 'ORDER',
        message: `${order.user.name} a acheté ${order.quantity} billet(s) pour "${order.event.title}" - ${order.totalPrice.toFixed(2)}€`,
        createdAt: order.createdAt
      });
    });

    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    recentUsers.forEach(user => {
      logs.push({
        type: 'USER',
        message: `Nouvel utilisateur: ${user.name} (${user.email})`,
        createdAt: user.createdAt
      });
    });

    const recentTickets = await prisma.ticket.findMany({
      where: { 
        createdAt: { gte: startDate },
        scanned: true
      },
      include: {
        event: { select: { title: true } },
        order: { include: { user: { select: { name: true } } } }
      },
      orderBy: { scannedAt: 'desc' },
      take: 30
    });

    recentTickets.forEach(ticket => {
      logs.push({
        type: 'TICKET',
        message: `Billet scanné pour "${ticket.event.title}" par ${ticket.order.user.name}`,
        createdAt: ticket.scannedAt
      });
    });

    const recentWaitlist = await prisma.waitlistEntry.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        user: { select: { name: true } },
        event: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    recentWaitlist.forEach(entry => {
      logs.push({
        type: 'WAITLIST',
        message: `${entry.user.name} rejoint la liste d'attente pour "${entry.event.title}"`,
        createdAt: entry.createdAt
      });
    });

    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ logs: logs.slice(0, 100) });
  } catch (err) {
    next(err);
  }
});

export default router;
