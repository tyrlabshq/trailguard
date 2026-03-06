import { Router, Request, Response } from 'express';

const router = Router();

// POST /locations
router.post('/', async (req: Request, res: Response) => {
  // TODO: Record rider location and broadcast to group via WebSocket
  res.json({ message: 'Location recorded' });
});

export default router;
