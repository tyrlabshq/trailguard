import { Request, Response, NextFunction } from 'express';

/**
 * Stub auth middleware: reads rider ID from x-rider-id header.
 * Real JWT auth will replace this in PL-15.
 */
export function requireRider(req: Request, res: Response, next: NextFunction) {
  const riderId = req.headers['x-rider-id'] as string | undefined;
  if (!riderId) {
    res.status(401).json({ error: 'Missing x-rider-id header' });
    return;
  }
  (req as any).riderId = riderId;
  next();
}
