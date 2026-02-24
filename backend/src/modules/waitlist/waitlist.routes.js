import { Router } from 'express';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';

const router = Router();

const processWaitlist = async (prisma, eventId) => {
  const entries = await prisma.waitlistEntry.findMany({
    where: { eventId, notifiedAt: null },
    orderBy: { position: 'asc' },
    take: 1
  });

  if (entries.length === 0) return null;

  const entry = entries[0];
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: { notifiedAt: new Date(), expiresAt }
  });

  console.log(`[WAITLIST] Notifying user ${entry.userId} for event ${eventId}. Expires at ${expiresAt}`);

  return entry;
};

router.post('/:eventId', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.availableSeats > 0) {
      return res.status(400).json({ error: 'Event has available seats' });
    }

    const existing = await prisma.waitlistEntry.findUnique({
      where: { userId_eventId: { userId, eventId } }
    });

    if (existing) {
      return res.status(409).json({ error: 'Already on waitlist', position: existing.position });
    }

    const maxPosition = await prisma.waitlistEntry.findFirst({
      where: { eventId },
      orderBy: { position: 'desc' }
    });

    const entry = await prisma.waitlistEntry.create({
      data: {
        userId,
        eventId,
        position: (maxPosition?.position || 0) + 1
      }
    });

    res.status(201).json({ message: 'Added to waitlist', position: entry.position });
  } catch (err) {
    next(err);
  }
});

router.delete('/:eventId', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    await prisma.waitlistEntry.deleteMany({
      where: { userId, eventId }
    });

    const remaining = await prisma.waitlistEntry.findMany({
      where: { eventId },
      orderBy: { position: 'asc' }
    });

    for (let i = 0; i < remaining.length; i++) {
      await prisma.waitlistEntry.update({
        where: { id: remaining[i].id },
        data: { position: i + 1 }
      });
    }

    res.json({ message: 'Removed from waitlist' });
  } catch (err) {
    next(err);
  }
});

router.get('/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const prisma = req.app.locals.prisma;
    const userId = req.user?.id;

    const entry = userId ? await prisma.waitlistEntry.findUnique({
      where: { userId_eventId: { userId, eventId } }
    }) : null;

    const count = await prisma.waitlistEntry.count({
      where: { eventId }
    });

    res.json({
      position: entry?.position || null,
      totalInWaitlist: count,
      expiresAt: entry?.expiresAt
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;

    const entries = await prisma.waitlistEntry.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        event: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(entries);
  } catch (err) {
    next(err);
  }
});

export { processWaitlist };
export default router;
