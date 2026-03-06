import { Router, Request, Response } from 'express';

const router = Router();

// GET /groups
router.get('/', async (req: Request, res: Response) => {
  // TODO: List groups for authenticated rider
  res.json([]);
});

// POST /groups
router.post('/', async (req: Request, res: Response) => {
  // TODO: Create a new group with 6-char code
  res.status(201).json({ message: 'Group created' });
});

// POST /groups/join
router.post('/join', async (req: Request, res: Response) => {
  // TODO: Join group by code
  res.json({ message: 'Joined group' });
});

// GET /groups/:id
router.get('/:id', async (req: Request, res: Response) => {
  // TODO: Get group details
  res.json({});
});

// PATCH /groups/:id
router.patch('/:id', async (req: Request, res: Response) => {
  // TODO: Update group (rally point, sweep, etc.)
  res.json({ message: 'Group updated' });
});

// DELETE /groups/:id/leave
router.delete('/:id/leave', async (req: Request, res: Response) => {
  // TODO: Leave a group
  res.json({ message: 'Left group' });
});

export default router;
