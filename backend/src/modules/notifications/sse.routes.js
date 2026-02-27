import { Router } from 'express';

const router = Router();

const clients = new Map();

router.get('/events/:eventId', (req, res) => {
  const { eventId } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = `${eventId}-${Date.now()}`;
  
  if (!clients.has(eventId)) {
    clients.set(eventId, new Map());
  }
  clients.get(eventId).set(clientId, res);

  req.on('close', () => {
    if (clients.has(eventId)) {
      clients.get(eventId).delete(clientId);
      if (clients.get(eventId).size === 0) {
        clients.delete(eventId);
      }
    }
  });
});

export const notifyEventUpdate = (eventId, data) => {
  if (clients.has(eventId)) {
    const eventClients = clients.get(eventId);
    eventClients.forEach((client) => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
};

router.get('/general', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = `general-${Date.now()}`;
  if (!clients.has('general')) {
    clients.set('general', new Map());
  }
  clients.get('general').set(clientId, res);

  req.on('close', () => {
    if (clients.has('general')) {
      clients.get('general').delete(clientId);
    }
  });
});

export const notifyNewEvent = (event) => {
  if (clients.has('general')) {
    const eventClients = clients.get('general');
    eventClients.forEach((client) => {
      client.write(`data: ${JSON.stringify({ type: 'new_event', event })}\n\n`);
    });
  }
};

export const notifyWaitlist = (eventId, userEmail) => {
  if (clients.has(eventId)) {
    const eventClients = clients.get(eventId);
    eventClients.forEach((client) => {
      client.write(`data: ${JSON.stringify({ type: 'waitlist_available', eventId, message: 'Des places sont disponibles!' })}\n\n`);
    });
  }
};

export default router;
