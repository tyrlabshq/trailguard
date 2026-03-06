import { Router, Request, Response } from 'express';

const router = Router();

// POST /auth/request-otp
router.post('/request-otp', async (req: Request, res: Response) => {
  // TODO: Generate and send OTP to phone number
  res.json({ message: 'OTP sent' });
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  // TODO: Verify OTP and return JWT
  res.json({ message: 'OTP verified' });
});

export default router;
