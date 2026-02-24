import { Router } from 'express';
import { handleStripeWebhook } from '../payment/payment.service.js';

const router = Router();

router.post('/webhook/stripe', async (req, res) => {
  const prisma = req.app.locals.prisma;
  await handleStripeWebhook(req, res, prisma);
});

export default router;
