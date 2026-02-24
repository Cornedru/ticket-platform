import { Router } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token required' })
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' })
  next()
}

/**
 * GET /api/analytics/overview
 * Dashboard principal — KPIs + graphiques
 */
router.get('/overview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma

    const [
      totalUsersCount,
      paidOrders,
      pendingOrders,
      cancelledOrders,
      totalTickets,
      activeEvents,
      allOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.ticket.count(),
      prisma.event.count({ where: { date: { gte: new Date() } } }),
      prisma.order.findMany({
        where: { status: 'PAID' },
        select: { totalPrice: true, createdAt: true, eventId: true, quantity: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalPrice, 0)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentOrders = allOrders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo)

    const dailyMap = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = 0
    }
    recentOrders.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10)
      if (dailyMap[key] !== undefined) dailyMap[key] += o.totalPrice
    })

    const dailyRevenue = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }))

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const prevPeriodOrders = allOrders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    })
    const prevRevenue = prevPeriodOrders.reduce((sum, o) => sum + o.totalPrice, 0)
    const revenueGrowth = prevRevenue > 0
      ? Math.round(((recentOrders.reduce((s, o) => s + o.totalPrice, 0) - prevRevenue) / prevRevenue) * 100)
      : 0

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const userGrowth = await prisma.user.count({ where: { createdAt: { gte: weekAgo } } })

    const eventRevenue = {}
    const eventTickets = {}
    allOrders.forEach(o => {
      eventRevenue[o.eventId] = (eventRevenue[o.eventId] || 0) + o.totalPrice
      eventTickets[o.eventId] = (eventTickets[o.eventId] || 0) + (o.quantity || 0)
    })

    const topEventIds = Object.entries(eventRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id)

    const topEventDetails = await prisma.event.findMany({
      where: { id: { in: topEventIds } },
      select: { id: true, title: true, totalSeats: true, availableSeats: true },
    })

    const topEvents = topEventDetails.map(ev => ({
      ...ev,
      revenue: eventRevenue[ev.id] || 0,
      soldTickets: eventTickets[ev.id] || 0,
      soldSeats: ev.totalSeats - ev.availableSeats,
    })).sort((a, b) => b.revenue - a.revenue)

    const monthStart = new Date()
    monthStart.setDate(1)
    const ticketGrowth = await prisma.ticket.count({ where: { createdAt: { gte: monthStart } } })

    res.json({
      totalRevenue,
      totalTickets,
      totalUsers: totalUsersCount,
      activeEvents,
      paidOrders,
      pendingOrders,
      cancelledOrders,
      dailyRevenue,
      topEvents,
      revenueGrowth,
      userGrowth,
      ticketGrowth,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/analytics/events
 * Stats détaillées par événement
 */
router.get('/events', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma

    const events = await prisma.event.findMany({
      include: {
        orders: { where: { status: 'PAID' }, select: { totalPrice: true, quantity: true, createdAt: true } },
        tickets: { select: { scanned: true } },
      },
      orderBy: { date: 'desc' },
    })

    const result = events.map(ev => ({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      category: ev.category,
      totalSeats: ev.totalSeats,
      availableSeats: ev.availableSeats,
      soldSeats: ev.totalSeats - ev.availableSeats,
      occupancyRate: Math.round(((ev.totalSeats - ev.availableSeats) / ev.totalSeats) * 100),
      revenue: ev.orders.reduce((s, o) => s + o.totalPrice, 0),
      totalOrders: ev.orders.length,
      ticketsScanned: ev.tickets.filter(t => t.scanned).length,
      totalTickets: ev.tickets.length,
    }))

    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
