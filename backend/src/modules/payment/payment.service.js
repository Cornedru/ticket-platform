import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const createPaymentIntent = async (order, idempotencyKey) => {
  if (!stripe) {
    return {
      id: `mock_${Date.now()}`,
      client_secret: null,
      status: 'succeeded'
    };
  }

  const existingIntent = await stripe.paymentIntents.list({
    limit: 1,
    metadata: { orderId: order.id }
  });

  if (existingIntent.data.length > 0) {
    return existingIntent.data[0];
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100),
    currency: 'eur',
    metadata: {
      orderId: order.id,
      userId: order.userId,
      eventId: order.eventId
    },
    idempotency_key: idempotencyKey
  });

  return intent;
};

export const handleStripeWebhook = async (req, res, prisma) => {
  if (!stripe) {
    return res.status(200).json({ received: true, mock: true });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object, prisma);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, prisma);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object, prisma);
        break;
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  res.json({ received: true });
};

const handlePaymentSuccess = async (paymentIntent, prisma) => {
  const { orderId } = paymentIntent.metadata;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === 'PAID') return;

  const { v4: uuidv4 } = await import('uuid');
  const QRCode = (await import('qrcode')).default;

  const tickets = [];
  for (let i = 0; i < order.quantity; i++) {
    const ticketId = uuidv4();
    const qrData = JSON.stringify({
      ticketId,
      orderId,
      eventId: order.eventId,
      userId: order.userId
    });

    const qrCode = await QRCode.toDataURL(qrData);

    await prisma.ticket.create({
      data: {
        id: ticketId,
        orderId,
        eventId: order.eventId,
        userId: order.userId,
        qrCode
      }
    });
    tickets.push({ id: ticketId });
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paymentId: paymentIntent.id }
    }),
    prisma.event.update({
      where: { id: order.eventId },
      data: { availableSeats: { decrement: order.quantity } }
    })
  ]);

  console.log(`Payment succeeded for order ${orderId}, ${tickets.length} tickets created`);
};

const handlePaymentFailed = async (paymentIntent, prisma) => {
  const { orderId } = paymentIntent.metadata;

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' }
  });

  console.log(`Payment failed for order ${orderId}`);
};

const handleRefund = async (charge, prisma) => {
  const paymentIntentId = charge.payment_intent;
  
  const order = await prisma.order.findFirst({
    where: { paymentId: paymentIntentId }
  });

  if (order) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' }
      }),
      prisma.event.update({
        where: { id: order.eventId },
        data: { availableSeats: { increment: order.quantity } }
      })
    ]);

    console.log(`Refund processed for order ${order.id}`);
  }
};

export { stripe };
