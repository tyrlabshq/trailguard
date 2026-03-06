import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireRider } from '../middleware/auth';

const router = Router();

// ─── Public: GET /emergency/:riderId ─────────────────────────────────────────
// No auth required — designed for first responders scanning a QR code

router.get('/:riderId', async (req: Request, res: Response) => {
  const { riderId } = req.params;

  try {
    // Get rider info
    const riderResult = await query(
      `SELECT id, name, avatar_url FROM riders WHERE id = $1`,
      [riderId]
    );

    if (riderResult.rows.length === 0) {
      res.status(404).json({ error: 'Rider not found' });
      return;
    }

    const rider = riderResult.rows[0];

    // Get emergency info
    const emergencyResult = await query(
      `SELECT blood_type, allergies, medications, conditions, emergency_contacts
       FROM emergency_info WHERE rider_id = $1`,
      [riderId]
    );

    const info = emergencyResult.rows[0] || {};

    // Get last known location
    const locationResult = await query(
      `SELECT ST_Y(location) AS lat, ST_X(location) AS lng, recorded_at
       FROM rider_locations
       WHERE rider_id = $1
       ORDER BY recorded_at DESC LIMIT 1`,
      [riderId]
    );

    const lastLocation = locationResult.rows[0]
      ? {
          lat: parseFloat(locationResult.rows[0].lat),
          lng: parseFloat(locationResult.rows[0].lng),
          recordedAt: locationResult.rows[0].recorded_at,
        }
      : null;

    // Check Accept header — if browser, render HTML
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      res.send(renderEmergencyPage({
        name: rider.name,
        avatarUrl: rider.avatar_url,
        bloodType: info.blood_type || null,
        allergies: info.allergies || [],
        medications: info.medications || [],
        conditions: info.conditions || null,
        emergencyContacts: info.emergency_contacts || [],
        lastLocation,
      }));
      return;
    }

    res.json({
      name: rider.name,
      avatarUrl: rider.avatar_url,
      bloodType: info.blood_type || null,
      allergies: info.allergies || [],
      medications: info.medications || [],
      conditions: info.conditions || null,
      emergencyContacts: info.emergency_contacts || [],
      lastLocation,
    });
  } catch (err) {
    console.error('Emergency lookup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Authenticated: GET /emergency/me — get my emergency info ─────────────────
router.get('/me/profile', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;

  try {
    const result = await query(
      `SELECT blood_type, allergies, medications, conditions, emergency_contacts
       FROM emergency_info WHERE rider_id = $1`,
      [riderId]
    );

    if (result.rows.length === 0) {
      res.json({ bloodType: null, allergies: [], medications: [], conditions: null, emergencyContacts: [] });
      return;
    }

    const row = result.rows[0];
    res.json({
      bloodType: row.blood_type,
      allergies: row.allergies || [],
      medications: row.medications || [],
      conditions: row.conditions,
      emergencyContacts: row.emergency_contacts || [],
    });
  } catch (err) {
    console.error('Error fetching emergency info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Authenticated: PUT /emergency/me — upsert my emergency info ──────────────
router.put('/me/profile', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;
  const { bloodType, allergies, medications, conditions, emergencyContacts } = req.body;

  // Validate emergency contacts (max 3)
  if (emergencyContacts && emergencyContacts.length > 3) {
    res.status(400).json({ error: 'Maximum 3 emergency contacts allowed' });
    return;
  }

  try {
    await query(
      `INSERT INTO emergency_info (rider_id, blood_type, allergies, medications, conditions, emergency_contacts, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (rider_id) DO UPDATE SET
         blood_type = EXCLUDED.blood_type,
         allergies = EXCLUDED.allergies,
         medications = EXCLUDED.medications,
         conditions = EXCLUDED.conditions,
         emergency_contacts = EXCLUDED.emergency_contacts,
         updated_at = now()`,
      [
        riderId,
        bloodType || null,
        allergies || [],
        medications || [],
        conditions || null,
        JSON.stringify(emergencyContacts || []),
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving emergency info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Authenticated: POST /emergency/sos — fire SOS ───────────────────────────
router.post('/sos', requireRider, async (req: Request, res: Response) => {
  const riderId = (req as any).riderId;
  const { groupId, lat, lng } = req.body;

  try {
    // Record SOS event
    await query(
      `INSERT INTO sos_events (rider_id, group_id, location)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326))`,
      [riderId, groupId || null, lat, lng]
    );

    // Also create a standard alert if in a group
    if (groupId) {
      await query(
        `INSERT INTO alerts (type, rider_id, group_id, location)
         VALUES ('sos', $1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326))`,
        [riderId, groupId, lat, lng]
      );
    }

    // Update last known location
    if (lat && lng) {
      await query(
        `INSERT INTO rider_locations (rider_id, group_id, location, source)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), 'sos')`,
        [riderId, groupId || null, lat, lng]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('SOS error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── HTML renderer for first-responder page ──────────────────────────────────

interface EmergencyData {
  name: string;
  avatarUrl: string | null;
  bloodType: string | null;
  allergies: string[];
  medications: string[];
  conditions: string | null;
  emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
  lastLocation: { lat: number; lng: number; recordedAt: string } | null;
}

function renderEmergencyPage(data: EmergencyData): string {
  const contactsHtml = data.emergencyContacts.length > 0
    ? data.emergencyContacts.map(c => `
        <div class="contact">
          <div class="contact-name">${escHtml(c.name)}</div>
          <div class="contact-rel">${escHtml(c.relationship)}</div>
          <a class="call-btn" href="tel:${escHtml(c.phone)}">📞 Call ${escHtml(c.phone)}</a>
        </div>`).join('')
    : '<p class="none">No emergency contacts on file</p>';

  const allergiesHtml = data.allergies.length > 0
    ? data.allergies.map(a => `<span class="tag danger">${escHtml(a)}</span>`).join(' ')
    : '<span class="none">None listed</span>';

  const medsHtml = data.medications.length > 0
    ? data.medications.map(m => `<span class="tag">${escHtml(m)}</span>`).join(' ')
    : '<span class="none">None listed</span>';

  const avatarHtml = data.avatarUrl
    ? `<img class="avatar" src="${escHtml(data.avatarUrl)}" alt="Rider photo" />`
    : `<div class="avatar-placeholder">👤</div>`;

  const locationHtml = data.lastLocation
    ? `<a class="map-link" href="https://maps.google.com/?q=${data.lastLocation.lat},${data.lastLocation.lng}" target="_blank">
         📍 View Last Known Location
       </a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>⚠️ Emergency Info — ${escHtml(data.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #111;
      color: #fff;
      min-height: 100vh;
      padding: 0 0 40px;
    }
    .header {
      background: #cc0000;
      padding: 20px 16px;
      text-align: center;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .header p { font-size: 13px; margin-top: 4px; opacity: 0.85; }
    .rider-block {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 16px;
      background: #1a1a1a;
      border-bottom: 1px solid #333;
    }
    .avatar, .avatar-placeholder {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      background: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      flex-shrink: 0;
    }
    .rider-name { font-size: 26px; font-weight: 700; }
    .section {
      padding: 16px;
      border-bottom: 1px solid #222;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 10px;
    }
    .blood-type {
      font-size: 48px;
      font-weight: 900;
      color: #ff4444;
      line-height: 1;
    }
    .tag {
      display: inline-block;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 15px;
      margin: 3px 3px 3px 0;
    }
    .tag.danger { background: #3a0000; border-color: #cc0000; color: #ff6666; }
    .none { color: #555; font-size: 14px; }
    .conditions-text { font-size: 16px; line-height: 1.5; color: #ddd; }
    .contact {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 10px;
    }
    .contact-name { font-size: 18px; font-weight: 700; }
    .contact-rel { font-size: 13px; color: #888; margin-bottom: 10px; }
    .call-btn {
      display: block;
      background: #006600;
      color: #fff;
      text-decoration: none;
      text-align: center;
      padding: 12px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 700;
    }
    .map-link {
      display: block;
      background: #003366;
      color: #fff;
      text-decoration: none;
      text-align: center;
      padding: 14px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 700;
      margin: 16px;
    }
    .footer {
      text-align: center;
      padding: 20px 16px 0;
      font-size: 12px;
      color: #444;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚠️ Emergency Medical Info</h1>
    <p>PowderLink — Snowmobile Safety Network</p>
  </div>

  <div class="rider-block">
    ${avatarHtml}
    <div class="rider-name">${escHtml(data.name)}</div>
  </div>

  <div class="section">
    <div class="section-title">Blood Type</div>
    <div class="blood-type">${escHtml(data.bloodType || '?')}</div>
  </div>

  <div class="section">
    <div class="section-title">⚠️ Allergies</div>
    ${allergiesHtml}
  </div>

  <div class="section">
    <div class="section-title">Medications</div>
    ${medsHtml}
  </div>

  ${data.conditions ? `
  <div class="section">
    <div class="section-title">Medical Conditions</div>
    <div class="conditions-text">${escHtml(data.conditions)}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Emergency Contacts</div>
    ${contactsHtml}
  </div>

  ${locationHtml}

  <div class="footer">
    This information was provided voluntarily by the rider for emergency use.<br/>
    Powered by PowderLink
  </div>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default router;
