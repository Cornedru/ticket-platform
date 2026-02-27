import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100, 'Le nom est trop long'),
  email: z.string().email('Format email invalide').max(255, 'Email trop long'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir un chiffre')
});

export const loginSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis')
});

export const createEventSchema = z.object({
  title: z.string()
    .min(3, 'Le titre doit contenir au moins 3 caractères')
    .max(200, 'Le titre est trop long')
    .transform(val => val.trim()),
  description: z.string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(2000, 'La description est trop longue')
    .transform(val => val.trim()),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Format de date invalide'),
  location: z.string()
    .min(3, 'Le lieu doit contenir au moins 3 caractères')
    .max(300, 'Le lieu est trop long')
    .transform(val => val.trim()),
  price: z.number()
    .positive('Le prix doit être positif')
    .max(10000, 'Le prix ne peut pas dépasser 10000€'),
  totalSeats: z.number()
    .int()
    .positive('Le nombre de places doit être positif')
    .max(100000, 'Trop de places'),
  videoUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  imageUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  category: z.enum(['CONCERT', 'FESTIVAL', 'HUMOUR', 'SPORT', 'THEATRE', 'CONFERENCE', 'OTHER']).optional()
});

export const createOrderSchema = z.object({
  eventId: z.string().uuid('ID événement invalide'),
  quantity: z.number()
    .int()
    .min(1, 'Au moins 1 billet requis')
    .max(10, 'Maximum 10 billets par commande')
});

export const waitlistSchema = z.object({
  eventId: z.string().uuid('ID événement invalide')
});

export const contactSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long')
    .transform(val => val.trim()),
  email: z.string().email('Format email invalide'),
  subject: z.enum(['order', 'ticket', 'payment', 'account', 'other'], {
    errorMap: () => ({ message: 'Sujet invalide' })
  }),
  message: z.string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(2000, 'Le message est trop long')
    .transform(val => val.trim())
});

export const transferSchema = z.object({
  recipientEmail: z.string().email('Format email invalide'),
  recipientName: z.string().max(100, 'Nom trop long').optional()
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100).optional(),
  bio: z.string().max(500, 'Bio trop longue').optional()
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir un chiffre')
});

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation échouée',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};
