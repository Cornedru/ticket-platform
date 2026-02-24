import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export const createOrder = async (req, res, next) => {
  try {
    const { eventId, quantity } = req.body;
    const userId = req.user.id;

    if (!eventId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Event and quantity required' });
    }

    const prisma = req.app.locals.prisma;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.availableSeats < quantity) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ error: 'Event has already occurred' });
    }

    const totalPrice = event.price * quantity;

    const order = await prisma.order.create({
      data: {
        userId,
        eventId,
        quantity,
        totalPrice,
        status: 'PENDING'
      }
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

export const processPayment = async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    const { orderId } = req.params;

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
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paymentId: mockPaymentId
      }
    });

    const tickets = [];
    for (let i = 0; i < order.quantity; i++) {
      const ticketId = uuidv4();
      const qrData = JSON.stringify({
        ticketId,
        orderId,
        eventId: order.eventId,
        userId: order.userId
      });
      
      const qrCode = await QRCode.toDataURL(qrData);

      const ticket = await prisma.ticket.create({
        data: {
          id: ticketId,
          orderId,
          eventId: order.eventId,
          userId: order.userId,
          qrCode
        }
      });
      tickets.push(ticket);
    }

    await prisma.event.update({
      where: { id: order.eventId },
      data: {
        availableSeats: { decrement: order.quantity }
      }
    });

    res.json({
      order: updatedOrder,
      tickets,
      payment: {
        id: mockPaymentId,
        status: 'success',
        method: paymentMethod || 'mock',
        amount: order.totalPrice
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            imageUrl: true
          }
        },
        tickets: {
          select: {
            id: true,
            qrCode: true,
            scanned: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        event: true,
        tickets: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        event: true,
        tickets: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
};
