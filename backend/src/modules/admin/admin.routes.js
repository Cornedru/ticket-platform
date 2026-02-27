import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requireAdmin } from '../../shared/middleware/auth.js';
import { adminAuditLog } from '../../shared/middleware/audit.js';

const router = Router();

router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { page = 1, limit = 20, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100);

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body;
    const prisma = req.app.locals.prisma;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name et password requis' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'USER'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', authenticate, requireAdmin, adminAuditLog('UPDATE_USER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const prisma = req.app.locals.prisma;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (email && email !== user.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email déjà utilisé' });
      }
      updateData.email = email;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', authenticate, requireAdmin, adminAuditLog('DELETE_USER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/orders', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const orders = await prisma.order.findMany({
      where: { userId: id },
      include: {
        event: { select: { id: true, title: true, date: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/tickets', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const tickets = await prisma.ticket.findMany({
      where: { 
        order: { userId: id }
      },
      include: {
        event: { select: { id: true, title: true, date: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

// Badge management
router.get('/badges', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { category } = req.query;

    const where = category ? { category } : {};

    const badges = await prisma.badge.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ badges });
  } catch (err) {
    next(err);
  }
});

router.post('/badges', authenticate, requireAdmin, adminAuditLog('CREATE_BADGE'), async (req, res, next) => {
  try {
    const { name, description, icon, category, condition, points } = req.body;
    const prisma = req.app.locals.prisma;

    if (!name || !description || !icon) {
      return res.status(400).json({ error: 'Nom, description et icône requis' });
    }

    const badge = await prisma.badge.create({
      data: {
        name,
        description,
        icon,
        category: category || 'ACHIEVEMENT',
        condition,
        points: points || 0
      }
    });

    res.status(201).json(badge);
  } catch (err) {
    next(err);
  }
});

router.put('/badges/:id', authenticate, requireAdmin, adminAuditLog('UPDATE_BADGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, category, condition, points } = req.body;
    const prisma = req.app.locals.prisma;

    const existing = await prisma.badge.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Badge non trouvé' });
    }

    const badge = await prisma.badge.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(icon && { icon }),
        ...(category && { category }),
        ...(condition !== undefined && { condition }),
        ...(points !== undefined && { points })
      }
    });

    res.json(badge);
  } catch (err) {
    next(err);
  }
});

router.delete('/badges/:id', authenticate, requireAdmin, adminAuditLog('DELETE_BADGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const existing = await prisma.badge.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Badge non trouvé' });
    }

    await prisma.badge.delete({ where: { id } });

    res.json({ message: 'Badge supprimé' });
  } catch (err) {
    next(err);
  }
});

router.get('/badges/:id/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const userBadges = await prisma.userBadge.findMany({
      where: { badgeId: id },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { earnedAt: 'desc' }
    });

    res.json({ userBadges });
  } catch (err) {
    next(err);
  }
});

router.post('/badges/:id/award', authenticate, requireAdmin, adminAuditLog('AWARD_BADGE'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const prisma = req.app.locals.prisma;

    if (!userId) {
      return res.status(400).json({ error: 'ID utilisateur requis' });
    }

    const badge = await prisma.badge.findUnique({ where: { id } });
    if (!badge) {
      return res.status(404).json({ error: 'Badge non trouvé' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const userBadge = await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: id } },
      create: { userId, badgeId: id },
      update: {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        badge: true
      }
    });

    res.json(userBadge);
  } catch (err) {
    next(err);
  }
});

router.delete('/badges/:id/revoke/:userId', authenticate, requireAdmin, adminAuditLog('REVOKE_BADGE'), async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const prisma = req.app.locals.prisma;

    await prisma.userBadge.delete({
      where: { userId_badgeId: { userId, badgeId: id } }
    });

    res.json({ message: 'Badge retiré' });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id/badges', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId: id },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' }
    });

    res.json({ userBadges });
  } catch (err) {
    next(err);
  }
});

export default router;
