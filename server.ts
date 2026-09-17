import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  startQuestionAttempt,
  submitQuestionAttempt,
  startEmergencyAttempt,
  submitEmergencyAttempt,
  getOrCreateSession,
  resetUserSession,
  pruneStaleAttempts,
} from './server/authoritativeEngine';
import { getDbHealth, getTeacherDashboardOverview, SERVER_VERSION } from './server/persistenceEngine';
import { SectorId } from './src/types';

const TEACHER_PASSCODE = process.env.TEACHER_PASSCODE || 'prof-ares-2026';

function requireTeacherAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers['authorization'];
  const teacherHeader = req.headers['x-teacher-key'];
  const token = authHeader?.replace('Bearer ', '') || teacherHeader;

  if (!token || token !== TEACHER_PASSCODE) {
    res.status(401).json({
      error: 'Acesso restrito: autorização de docente necessária para visualização da telemetria pedagógica.',
      errorCode: 'UNAUTHORIZED',
    });
    return;
  }
  next();
}

// Rate Limiting Bucket Store (Red Team Test 38)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

function rateLimiter(maxRequests: number = 120, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: () => void) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'client';
    const key = `${ip}_${req.path}`;
    const now = Date.now();

    const bucket = rateLimitMap.get(String(key));
    if (!bucket || now > bucket.resetAt) {
      rateLimitMap.set(String(key), {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (bucket.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: 'Muitas requisições (Rate Limit). Aguarde alguns instantes antes de tentar novamente.',
        errorCode: 'RATE_LIMITED',
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    bucket.count++;
    next();
  };
}

function classifyError(err: unknown): { status: number; message: string; errorCode: string } {
  const msg = err instanceof Error ? err.message : 'Unknown error';
  if (msg.includes('outro usuário') || msg.includes('FORBIDDEN')) {
    return { status: 400, message: msg, errorCode: 'FORBIDDEN' };
  }
  if (msg.includes('CONCURRENCY_CONFLICT')) {
    return { status: 409, message: msg, errorCode: 'CONCURRENCY_CONFLICT' };
  }
  if (msg.includes('Vidas esgotadas') || msg.includes('Game Over')) {
    return { status: 400, message: msg, errorCode: 'GAME_OVER' };
  }
  if (msg.includes('não encontrada') || msg.includes('inválida')) {
    return { status: 400, message: msg, errorCode: 'INVALID_ATTEMPT' };
  }
  return { status: 400, message: msg, errorCode: 'INVALID_REQUEST' };
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const startedAt = Date.now();

  app.use(express.json());

  // Apply Rate Limiter to all /api/ routes
  app.use('/api', rateLimiter(120, 60 * 1000));

  // Periodic memory prune every 10 minutes
  setInterval(() => {
    try {
      pruneStaleAttempts();
    } catch {
      // ignore
    }
  }, 10 * 60 * 1000).unref();

  // ==========================================
  // AUTHORITATIVE HEALTH CHECKS
  // ==========================================

  // Health check: Liveness & Readiness (Section 32)
  const healthHandler = (_req: Request, res: Response) => {
    const dbHealth = getDbHealth();
    const isReady = dbHealth.status === 'ok';

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ok' : 'degraded',
      serverVersion: SERVER_VERSION,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: Date.now(),
      engine: 'Missão Circuitos Elétricos Authoritative Engine',
      persistence: {
        type: 'SQLite-WAL-ACID',
        status: dbHealth.status,
        journalMode: dbHealth.journalMode,
        tablesCount: dbHealth.tables.length,
        totalSessions: dbHealth.totalSessions,
        totalAttempts: dbHealth.totalAttempts,
      },
      readiness: isReady,
      liveness: true,
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // ==========================================
  // AUTHORITATIVE API ROUTES
  // ==========================================

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
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
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
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Start a new question attempt (creates attemptId and authoritative deadlineAt)
  app.post('/api/attempt/start', (req: Request, res: Response) => {
    try {
      const { questionId, sectorId, uid, requestId: bodyReqId } = req.body;
      const requestId = (req.headers['x-request-id'] as string) || bodyReqId;

      if (!questionId || !sectorId) {
        res.status(400).json({ error: 'questionId e sectorId são obrigatórios.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = startQuestionAttempt(
        questionId,
        Number(sectorId) as SectorId,
        uid || 'astronaut',
        requestId
      );
      res.json(result);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Submit answer for an attempt (authoritative check, idempotent, timer-safe)
  app.post('/api/attempt/submit', (req: Request, res: Response) => {
    try {
      const { attemptId, selectedOptionId, usedHintLevel, uid, clientTimeLeft, requestId: bodyReqId } = req.body;
      const requestId = (req.headers['x-request-id'] as string) || bodyReqId;

      if (!attemptId || !selectedOptionId) {
        res.status(400).json({ error: 'attemptId e selectedOptionId são obrigatórios.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = submitQuestionAttempt({
        attemptId,
        selectedOptionId,
        usedHintLevel: usedHintLevel || 0,
        uid: uid || 'astronaut',
        requestId,
        clientTimeLeft,
      });

      res.json(result);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Start an emergency mission attempt (Time Trial mode)
  app.post('/api/timetrial/start', (req: Request, res: Response) => {
    try {
      const { missionId, uid, requestId: bodyReqId } = req.body;
      const requestId = (req.headers['x-request-id'] as string) || bodyReqId;

      if (!missionId) {
        res.status(400).json({ error: 'missionId é obrigatório.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = startEmergencyAttempt(missionId, uid || 'astronaut', requestId);
      res.json(result);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Submit emergency mission answer (authoritative, combo-safe, idempotent)
  app.post('/api/timetrial/submit', (req: Request, res: Response) => {
    try {
      const { attemptId, selectedOptionId, uid, comboCount, clientTimeLeft, requestId: bodyReqId } = req.body;
      const requestId = (req.headers['x-request-id'] as string) || bodyReqId;

      if (!attemptId || !selectedOptionId) {
        res.status(400).json({ error: 'attemptId e selectedOptionId são obrigatórios.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = submitEmergencyAttempt({
        attemptId,
        selectedOptionId,
        uid: uid || 'astronaut',
        comboCount: comboCount || 0,
        requestId,
        clientTimeLeft,
      });

      res.json(result);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Telemetry ingestion
  app.post('/api/telemetry/event', (req: Request, res: Response) => {
    res.status(202).json({ received: true, eventId: req.body?.id });
  });

  // ==========================================
  // TEACHER & PEDAGOGICAL MONITORING ROUTES
  // ==========================================

  // Verify teacher access passcode
  app.post('/api/teacher/verify-pin', (req: Request, res: Response) => {
    const { pin } = req.body || {};
    if (pin && pin === TEACHER_PASSCODE) {
      res.json({ ok: true, token: TEACHER_PASSCODE });
    } else {
      res.status(401).json({ ok: false, error: 'Credencial docente incorreta.', errorCode: 'INVALID_PIN' });
    }
  });

  // Get authoritative pedagogical dashboard (Protected)
  app.get('/api/teacher/overview', requireTeacherAuth, (_req: Request, res: Response) => {
    try {
      const overview = getTeacherDashboardOverview();
      res.json(overview);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Generic catch-all protection for administrative paths
  app.all('/api/admin/*', (_req: Request, res: Response) => {
    res.status(403).json({ error: 'Acesso restrito à administração da estação.', errorCode: 'FORBIDDEN' });
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
    console.log(`Missão Circuitos Elétricos 2.0 (Authoritative Persistent Engine) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
