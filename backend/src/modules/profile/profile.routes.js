import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, name: true, role: true,
        bio: true, avatarUrl: true, preferences: true, createdAt: true
      }
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, bio, avatarUrl, preferences } = req.body;
    const userId = req.user.id;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(preferences && { preferences })
      },
      select: { id: true, email: true, name: true, role: true, bio: true, avatarUrl: true, preferences: true }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    });

    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    next(err);
  }
});

router.put('/push-token', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { pushToken } = req.body;
    const userId = req.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken }
    });

    res.json({ message: 'Token push enregistré' });
  } catch (err) {
    next(err);
  }
});

router.get('/badges', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' }
    });

    res.json({ userBadges });
  } catch (err) {
    next(err);
  }
});

export default router;
