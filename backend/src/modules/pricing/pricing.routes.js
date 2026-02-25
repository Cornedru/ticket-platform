import { Router } from 'express';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';

const router = Router();

router.get('/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { days = 30 } = req.query;
    const prisma = req.app.locals.prisma;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const history = await prisma.priceHistory.findMany({
      where: {
        eventId,
        recordedAt: { gte: startDate }
      },
      orderBy: { recordedAt: 'asc' }
    });

    res.json({ history });
  } catch (err) {
    next(err);
  }
});

router.post('/:eventId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { price } = req.body;
    const prisma = req.app.locals.prisma;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    const priceHistory = await prisma.priceHistory.create({
      data: { eventId, price }
    });

    await prisma.event.update({
      where: { id: eventId },
      data: { price }
    });

    res.json({ message: 'Prix mis à jour', priceHistory });
  } catch (err) {
    next(err);
  }
});

export default router;
