import { v4 as uuidv4 } from 'uuid';

export const getEvents = async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { page = 1, limit = 10, upcoming } = req.query;

    const where = upcoming === 'true' 
      ? { date: { gte: new Date() } }
      : {};

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { date: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          location: true,
          price: true,
          totalSeats: true,
          availableSeats: true,
          imageUrl: true
        }
      }),
      prisma.event.count({ where })
    ]);

    res.json({
      events,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getEvent = async (req, res, next) => {
  try {
    const prisma = req.app.locals.prisma;
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        location: true,
        price: true,
        totalSeats: true,
        availableSeats: true,
        imageUrl: true,
        createdAt: true
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (err) {
    next(err);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, location, price, totalSeats, imageUrl } = req.body;

    if (!title || !description || !date || !location || !price || !totalSeats) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const prisma = req.app.locals.prisma;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        price: Number(price),
        totalSeats: Number(totalSeats),
        availableSeats: Number(totalSeats),
        imageUrl
      }
    });

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, price, totalSeats, imageUrl } = req.body;

    const prisma = req.app.locals.prisma;

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(location && { location }),
        ...(price && { price: Number(price) }),
        ...(totalSeats && { 
          totalSeats: Number(totalSeats),
          availableSeats: { increment: Number(totalSeats) - (await prisma.event.findUnique({ where: { id } }))?.totalSeats || 0 }
        }),
        ...(imageUrl && { imageUrl })
      }
    });

    res.json(event);
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prisma = req.app.locals.prisma;

    await prisma.event.delete({ where: { id } });

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
};
