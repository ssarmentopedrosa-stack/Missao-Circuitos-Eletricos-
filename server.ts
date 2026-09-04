import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  startQuestionAttempt,
  submitQuestionAttempt,
  getOrCreateSession,
  resetUserSession,
} from './src/utils/authoritativeEngine';
import { SectorId } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==========================================
  // AUTHORITATIVE API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '2.0.0',
      timestamp: Date.now(),
      engine: 'Missão Circuitos Elétricos Authoritative Engine',
    });
  });

  // Get or initialize user state (authoritative lives and score)
  app.get('/api/user/session/:uid', (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const session = getOrCreateSession(uid);
      res.json({
        uid: session.uid,
        lives: session.lives,
        score: session.score,
        completedSectors: Array.from(session.completedSectors),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ error: message });
    }
  });

  // Reset user session (upon GameOver restart or new game)
  app.post('/api/user/reset', (req: Request, res: Response) => {
    try {
      const { uid } = req.body;
      const session = resetUserSession(uid || 'anonymous');
      res.json({
        uid: session.uid,
        lives: session.lives,
        score: session.score,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ error: message });
    }
  });

  // Start a new question attempt (creates attemptId and authoritative deadlineAt)
  app.post('/api/attempt/start', (req: Request, res: Response) => {
    try {
      const { questionId, sectorId, uid } = req.body;
      if (!questionId || !sectorId) {
        res.status(400).json({ error: 'questionId e sectorId são obrigatórios.' });
        return;
      }

      const result = startQuestionAttempt(questionId, Number(sectorId) as SectorId, uid || 'astronaut');
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ error: message });
    }
  });

  // Submit answer for an attempt (authoritative check, idempotent, timer-safe)
  app.post('/api/attempt/submit', (req: Request, res: Response) => {
    try {
      const { attemptId, selectedOptionId, usedHintLevel, uid, clientTimeLeft } = req.body;
      if (!attemptId || !selectedOptionId) {
        res.status(400).json({ error: 'attemptId e selectedOptionId são obrigatórios.' });
        return;
      }

      const result = submitQuestionAttempt({
        attemptId,
        selectedOptionId,
        usedHintLevel: usedHintLevel || 0,
        uid: uid || 'astronaut',
        clientTimeLeft,
      });

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(400).json({ error: message });
    }
  });

  // Telemetry ingestion
  app.post('/api/telemetry/event', (req: Request, res: Response) => {
    // In future this persists to Firestore / BigQuery
    res.status(202).json({ received: true, eventId: req.body?.id });
  });

  // ==========================================
  // VITE MIDDLEWARE & STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Missão Circuitos Elétricos 2.0 running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
