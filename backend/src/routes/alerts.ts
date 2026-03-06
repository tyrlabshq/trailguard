import { Router, Request, Response } from 'express';

const router = Router();

// POST /alerts
router.post('/', async (req: Request, res: Response) => {
  // TODO: Fire alert (SOS, crash, dead man's switch)
  res.status(201).json({ message: 'Alert fired' });
});

// GET /alerts/:groupId
router.get('/:groupId', async (req: Request, res: Response) => {
  // TODO: Get active alerts for a group
  res.json([]);
});

export default router;
