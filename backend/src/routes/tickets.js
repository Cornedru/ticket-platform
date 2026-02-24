import { Router } from 'express';
import { 
  getTickets, 
  getTicket, 
  scanTicket,
  validateTicket 
} from '../controllers/ticketController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getTickets);
router.get('/:id', authenticate, getTicket);
router.post('/scan/:id', authenticate, requireAdmin, scanTicket);
router.post('/validate', authenticate, requireAdmin, validateTicket);

export default router;
