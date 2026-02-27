import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }]
      },
      include: {
        user1: { select: { id: true, name: true, bio: true, avatarUrl: true } },
        user2: { select: { id: true, name: true, bio: true, avatarUrl: true } }
      }
    });

    const friends = friendships.map(f => 
      f.userId1 === userId ? f.user2 : f.user1
    );

    res.json(friends);
  } catch (err) {
    next(err);
  }
});

router.get('/requests', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING'
      },
      include: {
        sender: { select: { id: true, name: true, bio: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (err) {
    next(err);
  }
});

router.get('/sent', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING'
      },
      include: {
        receiver: { select: { id: true, name: true, bio: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (err) {
    next(err);
  }
});

router.post('/request/:userId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même' });
    }

    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Demande déjà existante' });
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: senderId, userId2: receiverId },
          { userId1: receiverId, userId2: senderId }
        ]
      }
    });

    if (friendship) {
      return res.status(400).json({ error: 'Vous êtes déjà amis' });
    }

    const request = await prisma.friendRequest.create({
      data: { senderId, receiverId },
      include: {
        sender: { select: { id: true, name: true, bio: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, bio: true, avatarUrl: true } }
      }
    });

    res.json(request);
  } catch (err) {
    next(err);
  }
});

router.put('/request/:requestId/accept', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const requestId = req.params.requestId;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await prisma.$transaction([
      prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' }
      }),
      prisma.friendship.create({
        data: {
          userId1: request.senderId,
          userId2: request.receiverId
        }
      })
    ]);

    res.json({ message: 'Demande acceptée' });
  } catch (err) {
    next(err);
  }
});

router.put('/request/:requestId/reject', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const requestId = req.params.requestId;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    res.json({ message: 'Demande refusée' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:friendId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const friendId = req.params.friendId;

    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId1: userId, userId2: friendId },
          { userId1: friendId, userId2: userId }
        ]
      }
    });

    res.json({ message: 'Ami supprimé' });
  } catch (err) {
    next(err);
  }
});

router.get('/search', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          { name: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true, bio: true, avatarUrl: true },
      take: 10
    });

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }]
      }
    });

    const friendIds = new Set(
      friendships.flatMap(f => [f.userId1, f.userId2]).filter(id => id !== userId)
    );

    const pendingSent = await prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      select: { receiverId: true }
    });

    const sentIds = new Set(pendingSent.map(p => p.receiverId));

    const pendingReceived = await prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      select: { senderId: true }
    });

    const receivedIds = new Set(pendingReceived.map(p => p.senderId));

    const result = users.map(user => ({
      ...user,
      isFriend: friendIds.has(user.id),
      requestSent: sentIds.has(user.id),
      requestReceived: receivedIds.has(user.id)
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/users/:userId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.params.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, bio: true, avatarUrl: true, createdAt: true,
        _count: { select: { tickets: true, orders: true } }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/feed', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const { skip = 0, take = 20 } = req.query;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }]
      },
      select: { userId1: true, userId2: true }
    });

    const friendIds = [...new Set(friendships.flatMap(f => 
      f.userId1 === userId ? f.userId2 : f.userId1
    ))];

    const posts = await prisma.post.findMany({
      where: {
        userId: { in: [userId, ...friendIds] }
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        event: { select: { id: true, title: true, date: true, location: true, imageUrl: true } },
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(take)
    });

    res.json(posts);
  } catch (err) {
    next(err);
  }
});

router.post('/posts', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const { content, eventId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Le contenu est requis' });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content: content.trim(),
        ...(eventId && { eventId })
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        event: { select: { id: true, title: true, date: true, location: true, imageUrl: true } }
      }
    });

    res.json(post);
  } catch (err) {
    next(err);
  }
});

router.delete('/posts/:postId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const postId = req.params.postId;

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post non trouvé' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({ message: 'Post supprimé' });
  } catch (err) {
    next(err);
  }
});

router.get('/posts/:postId/comments', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { postId } = req.params;
    const { skip = 0, take = 50 } = req.query;

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'asc' },
      skip: parseInt(skip),
      take: parseInt(take)
    });

    res.json(comments);
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:postId/comments', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Le contenu est requis' });
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        postId,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    res.json(comment);
  } catch (err) {
    next(err);
  }
});

router.delete('/comments/:commentId', authenticate, async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = req.user.id;
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    res.json({ message: 'Commentaire supprimé' });
  } catch (err) {
    next(err);
  }
});

export default router;
