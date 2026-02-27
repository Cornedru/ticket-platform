import { Router } from 'express';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    console.log(`[CONTACT] New message from ${name} (${email}) - Subject: ${subject}`);
    console.log(`[CONTACT] Message: ${message}`);

    res.json({ message: 'Message received. We will get back to you soon!' });
  } catch (err) {
    next(err);
  }
});

export default router;
