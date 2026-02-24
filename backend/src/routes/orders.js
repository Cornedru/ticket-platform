import { Router } from 'express';
import { 
  createOrder, 
  processPayment, 
  getOrders, 
  getOrder,
  getAllOrders 
} from '../controllers/orderController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createOrder);
router.post('/:orderId/pay', authenticate, processPayment);
router.get('/', authenticate, getOrders);
router.get('/all', authenticate, requireAdmin, getAllOrders);
router.get('/:id', authenticate, getOrder);

export default router;
