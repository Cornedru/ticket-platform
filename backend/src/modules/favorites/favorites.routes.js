import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true, title: true, description: true, date: true,
            location: true, price: true, totalSeats: true, availableSeats: true,
            imageUrl: true, videoUrl: true, category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ favorites: favorites.map(f => f.event) });
  } catch (err) {
    next(err);
  }
});

router.post('/:eventId', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_eventId: { userId, eventId } }
    });

    if (existing) {
      return res.status(409).json({ error: 'Déjà dans les favoris' });
    }

    const favorite = await prisma.favorite.create({
      data: { userId, eventId }
    });

    res.json({ message: 'Ajouté aux favoris', favorite });
  } catch (err) {
    next(err);
  }
});

router.delete('/:eventId', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    await prisma.favorite.deleteMany({
      where: { userId, eventId }
    });

    res.json({ message: 'Retiré des favoris' });
  } catch (err) {
    next(err);
  }
});

router.get('/:eventId/check', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const prisma = req.app.locals.prisma;

    const favorite = await prisma.favorite.findUnique({
      where: { userId_eventId: { userId, eventId } }
    });

    res.json({ isFavorite: !!favorite });
  } catch (err) {
    next(err);
  }
});

export default router;
