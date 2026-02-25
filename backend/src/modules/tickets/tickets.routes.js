import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';

const router = Router();

const scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de scans, veuillez réessayer plus tard.' }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const tickets = await prisma.ticket.findMany({
      where: { 
        OR: [
          { userId },
          { originalUserId: userId }
        ]
      },
      include: {
        event: { select: { id: true, title: true, date: true, location: true, imageUrl: true } },
        order: { select: { id: true, paymentId: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const ticket = await prisma.ticket.findFirst({
      where: { id, OR: [{ userId }, { originalUserId: userId }] },
      include: {
        event: true,
        order: { select: { id: true, paymentId: true, status: true, quantity: true, totalPrice: true } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/transfer', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recipientEmail, recipientName } = req.body;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const maxTransfers = parseInt(process.env.MAX_TICKET_TRANSFERS) || 2;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to transfer this ticket' });
    }

    const eventDate = new Date(ticket.event.date);
    const now = new Date();
    const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

    if (hoursUntilEvent < 48) {
      return res.status(400).json({ error: 'Cannot transfer tickets within 48 hours of the event' });
    }

    const transferHistory = ticket.transferHistory || [];
    if (transferHistory.length >= maxTransfers) {
      return res.status(400).json({ error: `Maximum ${maxTransfers} transfers allowed` });
    }

    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail }
    });

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient must have a TicketHub account' });
    }

    const newQrData = JSON.stringify({
      ticketId: ticket.id,
      orderId: ticket.orderId,
      eventId: ticket.eventId,
      userId: recipient.id,
      timestamp: Date.now(),
      transferred: true
    });

    const newQrCode = await QRCode.toDataURL(newQrData);

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        userId: recipient.id,
        holderName: recipientName || recipient.name,
        holderEmail: recipientEmail,
        transferredAt: new Date(),
        originalUserId: ticket.originalUserId || userId,
        transferHistory: [
          ...transferHistory,
          { from: req.user.email, to: recipientEmail, at: new Date().toISOString() }
        ],
        qrCode: newQrCode
      }
    });

    console.log(`[TRANSFER] Ticket ${id} transferred from ${req.user.email} to ${recipientEmail}`);

    res.json({ message: 'Ticket transferred successfully', ticket: updatedTicket });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const ticket = await prisma.ticket.findFirst({
      where: { id, OR: [{ userId }, { originalUserId: userId }] },
      select: { transferHistory: true, originalUserId: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ history: ticket.transferHistory || [], originalOwner: ticket.originalUserId });
  } catch (err) {
    next(err);
  }
});

router.post('/scan/:id', authenticate, requireAdmin, scanLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.scanned) {
      return res.status(400).json({ error: 'Ticket already scanned', scannedAt: ticket.scannedAt });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { scanned: true, scannedAt: new Date() },
      include: {
        event: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ message: 'Ticket validated successfully', ticket: updatedTicket });
  } catch (err) {
    next(err);
  }
});

router.post('/validate', authenticate, requireAdmin, scanLimiter, async (req, res, next) => {
  try {
    const { qrData } = req.body;
    const prisma = req.app.locals.prisma;

    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ error: 'Invalid QR code format', valid: false });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: parsed.ticketId },
      include: { event: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found', valid: false });
    }

    if (ticket.scanned) {
      return res.status(400).json({ error: 'Ticket already scanned', scannedAt: ticket.scannedAt, valid: false });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { scanned: true, scannedAt: new Date() },
      include: {
        event: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ valid: true, ticket: updatedTicket });
  } catch (err) {
    next(err);
  }
});

export default router;
