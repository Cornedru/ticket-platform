import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';
import PDFDocument from 'pdfkit';
import { sendTicketTransfer } from '../notifications/email.service.js';

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

router.get('/listings', async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { status = 'ACTIVE' } = req.query;

    const listings = await prisma.ticketListing.findMany({
      where: { status },
      include: {
        ticket: {
          include: {
            event: { select: { id: true, title: true, date: true, location: true, imageUrl: true } }
          }
        },
        seller: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(listings);
  } catch (err) {
    next(err);
  }
});

router.get('/listings/my', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const listings = await prisma.ticketListing.findMany({
      where: { sellerId: userId },
      include: {
        ticket: {
          include: {
            event: { select: { id: true, title: true, date: true, location: true, imageUrl: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(listings);
  } catch (err) {
    next(err);
  }
});

router.put('/listings/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, description, status } = req.body;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const listing = await prisma.ticketListing.findUnique({
      where: { id }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    if (listing.sellerId !== userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier cette annonce' });
    }

    const updated = await prisma.ticketListing.update({
      where: { id },
      data: {
        ...(price && { price: parseFloat(price) }),
        ...(description !== undefined && { description }),
        ...(status && { status })
      },
      include: {
        ticket: { include: { event: true } },
        seller: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/listings/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const listing = await prisma.ticketListing.findUnique({
      where: { id }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    if (listing.sellerId !== userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer cette annonce' });
    }

    if (listing.status === 'SOLD') {
      return res.status(400).json({ error: 'Impossible de supprimer une annonce vendée' });
    }

    await prisma.ticketListing.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Annonce supprimée' });
  } catch (err) {
    next(err);
  }
});

router.post('/listings/:id/buy', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const listing = await prisma.ticketListing.findUnique({
      where: { id },
      include: {
        ticket: { include: { event: true } },
        seller: { select: { id: true, email: true, name: true } }
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cette annonce n\'est plus active' });
    }

    if (listing.sellerId === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas acheter votre propre billet' });
    }

    await prisma.ticketListing.update({
      where: { id },
      data: { status: 'SOLD' }
    });

    const eventDate = new Date(listing.ticket.event.date);
    const hoursUntilEvent = (eventDate - new Date()) / (1000 * 60 * 60);
    const canTransfer = hoursUntilEvent > 48;

    res.json({
      message: 'Achat réussi ! Le billet vous a été transféré.',
      listing: { ...listing, status: 'SOLD' },
      transfer: canTransfer ? null : 'Moins de 48h avant l\'événement'
    });
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

    sendTicketTransfer(req.user, recipientEmail, ticket, event).catch(console.error);

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

router.get('/:id/pdf', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const ticket = await prisma.ticket.findFirst({
      where: { id, OR: [{ userId }, { originalUserId: userId }] },
      include: {
        event: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({ ticketId: ticket.id, eventId: ticket.eventId }), {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=billet-${ticket.event.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);

    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#050508');
    
    doc.fillColor('#FF00FF').fontSize(28).font('Helvetica-Bold').text('TRIP', 50, 40);
    doc.fillColor('#00FFFF').fontSize(12).font('Helvetica').text('BILLET D\'ACCÈS', 50, 75);
    
    doc.moveTo(50, 100).lineTo(doc.page.width - 50, 100).strokeColor('#333333').lineWidth(2).stroke();

    doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text(ticket.event.title, 50, 120, { width: doc.page.width - 100 });
    
    doc.moveDown(0.5);
    doc.fillColor('#AAAAAA').fontSize(14).font('Helvetica');
    doc.text(`📅 ${new Date(ticket.event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
    doc.text(`📍 ${ticket.event.location}`);
    
    doc.moveDown(0.5);
    doc.fillColor('#39FF14').fontSize(12).font('Helvetica-Bold').text(`Place: ${ticket.seat || 'Placement libre'}`);
    doc.fillColor('#AAAAAA').fontSize(10).text(`Catégorie: ${ticket.category || 'Standard'}`);
    
    doc.moveDown();
    doc.fillColor('#FF00FF').fontSize(10).text(`Réf: ${ticket.id.slice(0, 8).toUpperCase()}`);
    doc.fillColor('#666666').fontSize(8).text(`Acheté par: ${ticket.user.name} | ${ticket.user.email}`);

    doc.image(qrCodeDataUrl, (doc.page.width - 150) / 2, 320, { width: 150, height: 150 });
    
    doc.fillColor('#FFFFFF').fontSize(8).text('Scannez ce code à l\'entrée', (doc.page.width - 150) / 2, 480, { width: 150, align: 'center' });

    doc.moveTo(50, 500).lineTo(doc.page.width - 50, 500).strokeColor('#333333').lineWidth(1).stroke();
    
    doc.fillColor('#666666').fontSize(7).text(
      'Ce billet est personnel et nominatif. Il est non échangeable et non remboursable. En cas de problème, contactez support@trip.example.com',
      50, 510, { width: doc.page.width - 100, align: 'center' }
    );
    doc.fillColor('#444444').fontSize(6).text('TRIP - Plateforme de billetterie | trip.example.com', 50, 560, { width: doc.page.width - 100, align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/list', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, description } = req.body;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Prix invalide' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { event: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket non trouvé' });
    }

    if (ticket.userId !== userId) {
      return res.status(403).json({ error: 'Vous ne possédez pas ce billet' });
    }

    if (ticket.scanned) {
      return res.status(400).json({ error: 'Impossible de vendre un billet déjà utilisé' });
    }

    const eventDate = new Date(ticket.event.date);
    if (eventDate < new Date()) {
      return res.status(400).json({ error: 'Impossible de vendre un billet pour un événement passé' });
    }

    const existingListing = await prisma.ticketListing.findFirst({
      where: { ticketId: id, status: 'ACTIVE' }
    });

    if (existingListing) {
      return res.status(400).json({ error: 'Ce billet est déjà en vente' });
    }

    const listing = await prisma.ticketListing.create({
      data: {
        ticketId: id,
        sellerId: userId,
        price: parseFloat(price),
        description
      },
      include: {
        ticket: { include: { event: true } },
        seller: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    console.log(`[LISTING] Ticket ${id} listed for ${price}€ by user ${userId}`);

    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
});

router.put('/listings/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, description, status } = req.body;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const listing = await prisma.ticketListing.findUnique({
      where: { id }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    if (listing.sellerId !== userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier cette annonce' });
    }

    const updated = await prisma.ticketListing.update({
      where: { id },
      data: {
        ...(price && { price: parseFloat(price) }),
        ...(description !== undefined && { description }),
        ...(status && { status })
      },
      include: {
        ticket: { include: { event: true } },
        seller: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/listings/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const listing = await prisma.ticketListing.findUnique({
      where: { id }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    if (listing.sellerId !== userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer cette annonce' });
    }

    if (listing.status === 'SOLD') {
      return res.status(400).json({ error: 'Impossible de supprimer une annonce vendée' });
    }

    await prisma.ticketListing.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Annonce supprimée' });
  } catch (err) {
    next(err);
  }
});

router.post('/listings/:id/buy', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const listing = await prisma.ticketListing.findUnique({
      where: { id },
      include: {
        ticket: { include: { event: true } },
        seller: { select: { id: true, email: true, name: true } }
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Annonce non trouvée' });
    }

    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cette annonce n\'est plus active' });
    }

    if (listing.sellerId === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas acheter votre propre billet' });
    }

    await prisma.ticketListing.update({
      where: { id },
      data: { status: 'SOLD' }
    });

    const eventDate = new Date(listing.ticket.event.date);
    const hoursUntilEvent = (eventDate - new Date()) / (1000 * 60 * 60);
    const canTransfer = hoursUntilEvent > 48;

    res.json({
      message: 'Achat réussi ! Le billet vous a été transféré.',
      listing: { ...listing, status: 'SOLD' },
      transfer: canTransfer ? null : 'Moins de 48h avant l\'événement'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
