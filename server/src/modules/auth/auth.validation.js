const { z } = require('zod');

const email = z.string().email('Invalid email').max(120);
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const fullName = z.string().min(2, 'Name must be at least 2 characters').max(120);
const phone = z
  .string()
  .min(7, 'Invalid phone')
  .max(20)
  .regex(/^[+\d][\d\s-]*$/, 'Invalid phone format');

const registerSchema = z.object({
  fullName,
  email,
  phone,
  password,
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'])
    .optional()
    .nullable(),
});

const loginSchema = z.object({
  email: email.or(z.literal('')).optional(),
  phone: phone.optional(),
  password,
});

const forgotPasswordSchema = z.object({ email });

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: password,
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
