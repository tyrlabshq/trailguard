import { Router, Request, Response } from 'express';

const router = Router();

// GET /trails/conditions
router.get('/conditions', async (req: Request, res: Response) => {
  // TODO: Get trail conditions near location
  res.json([]);
});

// POST /trails/conditions
router.post('/conditions', async (req: Request, res: Response) => {
  // TODO: Report trail condition
  res.status(201).json({ message: 'Condition reported' });
});

export default router;
