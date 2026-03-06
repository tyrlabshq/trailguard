import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import locationRoutes from './routes/locations';
import alertRoutes from './routes/alerts';
import trailRoutes from './routes/trails';

const app = express();
const PORT = parseInt(process.env.PORT || '8420', 10);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'powderlink-api' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/locations', locationRoutes);
app.use('/alerts', alertRoutes);
app.use('/trails', trailRoutes);

// HTTP + WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // TODO: Handle incoming WebSocket messages (location updates, alerts)
    console.log('ws message:', data.toString());
  });

  ws.send(JSON.stringify({ type: 'connected', service: 'powderlink-ws' }));
});

server.listen(PORT, () => {
  console.log(`PowderLink API listening on :${PORT}`);
});
