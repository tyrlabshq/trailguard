import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireRider } from '../middleware/auth';
import { startCMO, cancelCMO, getCMO } from '../services/countMeOut';

const router = Router();

const VALID_DURATIONS = [15, 30, 45, 60, 90];

// POST /alerts/count-me-out/start — Rider is taking a detour
router.post('/start', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;
  const { groupId, durationMinutes, note } = req.body;

  if (!groupId) {
    res.status(400).json({ error: 'groupId is required' });
    return;
  }
  if (!VALID_DURATIONS.includes(durationMinutes)) {
    res.status(400).json({ error: `durationMinutes must be one of: ${VALID_DURATIONS.join(', ')}` });
    return;
  }
  if (note && typeof note !== 'string') {
    res.status(400).json({ error: 'note must be a string' });
    return;
  }
  if (note && note.length > 120) {
    res.status(400).json({ error: 'note must be 120 characters or fewer' });
    return;
  }

  // Verify membership
  const member = await query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND rider_id = $2',
    [groupId, riderId],
  );
  if (member.rows.length === 0) {
    res.status(403).json({ error: 'Not a member of this group' });
    return;
  }

  const timer = await startCMO(riderId, groupId, durationMinutes, note?.trim() || undefined);
  res.json({ ok: true, etaAt: timer.etaAt, durationMinutes });
});

// POST /alerts/count-me-out/cancel — Rider rejoins ("I'm back")
router.post('/cancel', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;

  const cancelled = await cancelCMO(riderId);
  if (!cancelled) {
    res.status(404).json({ error: 'No active count-me-out timer' });
    return;
  }

  res.json({ ok: true });
});

// GET /alerts/count-me-out/status — Check if rider has an active timer
router.get('/status', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;

  const timer = await getCMO(riderId);
  if (!timer) {
    res.json({ active: false });
    return;
  }

  const now = Date.now();
  const etaMs = new Date(timer.etaAt).getTime();
  const msRemaining = Math.max(0, etaMs - now);

  res.json({
    active: true,
    etaAt: timer.etaAt,
    durationMinutes: timer.durationMinutes,
    note: timer.note ?? null,
    minutesRemaining: Math.ceil(msRemaining / 60_000),
  });
});

export default router;
