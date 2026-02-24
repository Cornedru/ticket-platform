export const getTickets = async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const tickets = await prisma.ticket.findMany({
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
        order: {
          select: {
            id: true,
            paymentId: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (err) {
    next(err);
  }
};

export const getTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const ticket = await prisma.ticket.findFirst({
      where: { id, userId },
      include: {
        event: true,
        order: {
          select: {
            id: true,
            paymentId: true,
            status: true,
            quantity: true,
            totalPrice: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

export const scanTicket = async (req, res, next) => {
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
      return res.status(400).json({ 
        error: 'Ticket already scanned',
        scannedAt: ticket.scannedAt
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        scanned: true,
        scannedAt: new Date()
      },
      include: {
        event: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      message: 'Ticket validated successfully',
      ticket: updatedTicket
    });
  } catch (err) {
    next(err);
  }
};

export const validateTicket = async (req, res, next) => {
  try {
    const { qrData } = req.body;

    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const prisma = req.app.locals.prisma;

    const ticket = await prisma.ticket.findUnique({
      where: { id: parsed.ticketId },
      include: { event: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found', valid: false });
    }

    if (ticket.scanned) {
      return res.status(400).json({ 
        error: 'Ticket already scanned',
        scannedAt: ticket.scannedAt,
        valid: false
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        scanned: true,
        scannedAt: new Date()
      },
      include: {
        event: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      valid: true,
      ticket: updatedTicket
    });
  } catch (err) {
    next(err);
  }
};
