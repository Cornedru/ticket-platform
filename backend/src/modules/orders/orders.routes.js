import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';

const router = Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { eventId, quantity } = req.body;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    if (!eventId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Event and quantity required' });
    }

    // Transaction atomique pour éviter race condition
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) {
        throw Object.assign(new Error('Event not found'), { status: 404 });
      }

      if (event.availableSeats < quantity) {
        throw Object.assign(new Error('Not enough seats available'), { status: 400 });
      }

      if (new Date(event.date) < new Date()) {
        throw Object.assign(new Error('Event has already occurred'), { status: 400 });
      }

      const totalPrice = event.price * quantity;
      const idempotencyKey = `${userId}:${eventId}:${Date.now()}`;

      const order = await tx.order.create({
        data: { userId, eventId, quantity, totalPrice, status: 'PENDING' }
      });

      return { order, totalPrice, idempotencyKey };
    });

    res.status(201).json({ ...result.order, idempotencyKey: result.idempotencyKey });
  } catch (err) {
    next(err);
  }
});

router.post('/:orderId/pay', authenticate, async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod } = req.body;
    const prisma = req.app.locals.prisma;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { event: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order already processed' });
    }

    const mockPaymentId = `MOCK-${uuidv4().substring(0, 8).toUpperCase()}`;

    const tickets = [];
    for (let i = 0; i < order.quantity; i++) {
      const ticketId = uuidv4();
      const qrData = JSON.stringify({
        ticketId,
        orderId,
        eventId: order.eventId,
        userId: order.userId,
        timestamp: Date.now()
      });

      const qrCode = await QRCode.toDataURL(qrData);

      const ticket = await prisma.ticket.create({
        data: { id: ticketId, orderId, eventId: order.eventId, userId: order.userId, qrCode }
      });
      tickets.push(ticket);
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID', paymentId: mockPaymentId }
      }),
      prisma.event.update({
        where: { id: order.eventId },
        data: { availableSeats: { decrement: order.quantity } }
      })
    ]);

    res.json({
      order: { ...order, status: 'PAID', paymentId: mockPaymentId },
      tickets,
      payment: { id: mockPaymentId, status: 'success', method: paymentMethod || 'mock', amount: order.totalPrice }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        event: { select: { id: true, title: true, date: true, location: true, imageUrl: true } },
        tickets: { select: { id: true, qrCode: true, scanned: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.get('/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        event: true,
        tickets: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: { event: true, tickets: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

export default router;
