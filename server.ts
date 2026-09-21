import express, { Request, Response, NextFunction } from 'express';
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
import {
  getDbHealth,
  getTeacherDashboardOverview,
  getTeacherDashboard,
  getStudentPerformanceDetails,
  getQuestionsAnalytics,
  getTeacherAttemptsHistory,
  createClass,
  findClassesByTeacher,
  findStudentClasses,
  joinClass,
  findSessionByToken,
  deleteSession,
  SERVER_VERSION,
  UserSanitized,
  UserSessionRecord,
} from './server/persistenceEngine';
import {
  registerWithPassword,
  loginWithPassword,
  loginOrRegisterWithGoogle,
  requestPasswordReset,
  resetPasswordWithToken,
  updateUserProfile,
} from './server/authEngine';
import { SectorId } from './src/types';

const TEACHER_PASSCODE = process.env.TEACHER_PASSCODE || 'prof-ares-2026';

function getAuthFromReq(req: Request): { session: UserSessionRecord; user: UserSanitized } | null {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-session-token']) {
    token = String(req.headers['x-session-token']).trim();
  }
  if (!token) return null;
  return findSessionByToken(token);
}

function requireTeacherAuth(req: Request, res: Response, next: () => void) {
  const rawAuth = req.headers['authorization'];
  const rawTeacher = req.headers['x-teacher-key'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  const teacherHeader = Array.isArray(rawTeacher) ? rawTeacher[0] : rawTeacher;
  const token = (authHeader ? authHeader.replace('Bearer ', '').trim() : '') || (teacherHeader ? teacherHeader.trim() : '');

  if (token === TEACHER_PASSCODE) {
    return next();
  }

  if (token) {
    const sessionData = findSessionByToken(token);
    if (sessionData) {
      if (sessionData.user.role === 'teacher') {
        return next();
      }
      // Usuário autenticado, porém com perfil de aluno tentando acessar área restrita
      res.status(403).json({
        error: 'Acesso restrito: este recurso é exclusivo para professores e docentes.',
        errorCode: 'FORBIDDEN',
      });
      return;
    }
  }

  res.status(401).json({
    error: 'Acesso restrito: autorização de docente necessária para visualização da telemetria pedagógica.',
    errorCode: 'UNAUTHORIZED',
  });
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
  const PORT = Number(process.env.PORT) || 3000;
  const startedAt = Date.now();

  app.use(express.json());

  // Configuração de CORS para permitir requisições do frontend Vercel e ambientes locais
  const allowedOrigins = [
    'https://missao-circuitos-eletricos.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  if (process.env.ALLOWED_ORIGIN) {
    allowedOrigins.push(process.env.ALLOWED_ORIGIN);
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/missao-circuitos-eletricos.*\.vercel\.app$/.test(origin);

      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, x-session-token, x-teacher-key, x-request-id, x-student-id, x-device-id'
        );
      }
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

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
  // AUTHENTICATION & IDENTITY ROUTES (Phase 1)
  // ==========================================

  // Register new student account with email and password
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { name, email, password, confirmPassword } = req.body || {};
      if (confirmPassword !== undefined && confirmPassword !== password) {
        res.status(400).json({ error: 'As senhas digitadas não coincidem.', errorCode: 'PASSWORD_MISMATCH' });
        return;
      }
      const result = registerWithPassword({ name, email, password });
      res.status(201).json({
        user: result.user,
        sessionToken: result.sessionToken,
        token: result.sessionToken,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao criar conta.', errorCode: 'REGISTRATION_ERROR' });
    }
  });

  // Login with email and password
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      const result = loginWithPassword({ email, password });
      res.json({
        user: result.user,
        sessionToken: result.sessionToken,
        token: result.sessionToken,
      });
    } catch (err: any) {
      res.status(401).json({
        error: err.message || 'Não foi possível entrar. Verifique seu e-mail e sua senha.',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }
  });

  // Authenticate with Google identity credential
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { credential } = req.body || {};
      if (!credential) {
        res.status(400).json({ error: 'Credencial do Google é obrigatória.', errorCode: 'MISSING_CREDENTIAL' });
        return;
      }
      const result = await loginOrRegisterWithGoogle(credential);
      res.json({
        user: result.user,
        sessionToken: result.sessionToken,
        token: result.sessionToken,
      });
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Falha ao autenticar com o Google.', errorCode: 'GOOGLE_AUTH_FAILED' });
    }
  });

  // Get currently authenticated user profile
  app.get(['/api/auth/me', '/api/me', '/api/student/profile'], (req: Request, res: Response) => {
    const auth = getAuthFromReq(req);
    if (!auth) {
      res.status(401).json({ error: 'Sessão não autenticada.', errorCode: 'UNAUTHORIZED' });
      return;
    }
    res.json({ user: auth.user });
  });

  // Student join class by invitation code
  app.post('/api/classes/join', (req: Request, res: Response) => {
    try {
      const auth = getAuthFromReq(req);
      const { code, studentId } = req.body || {};
      const effectiveStudentId = auth ? auth.user.id : studentId;

      if (!effectiveStudentId) {
        res.status(401).json({ error: 'Aluno não identificado. Faça login para entrar em uma turma.', errorCode: 'UNAUTHORIZED' });
        return;
      }

      if (!code) {
        res.status(400).json({ error: 'Código da turma é obrigatório.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = joinClass({ studentId: effectiveStudentId, code: String(code) });
      res.json(result);
    } catch (err: any) {
      const isNotFound = err.message?.includes('inválido') || err.message?.includes('inativa');
      res.status(isNotFound ? 404 : 400).json({
        error: err.message || 'Falha ao ingressar na turma.',
        errorCode: isNotFound ? 'CLASS_NOT_FOUND' : 'JOIN_CLASS_FAILED',
      });
    }
  });

  // Get student enrolled classes
  app.get('/api/student/classes', (req: Request, res: Response) => {
    const auth = getAuthFromReq(req);
    const queryStudentId = req.query.studentId as string;
    const effectiveStudentId = auth ? auth.user.id : queryStudentId;

    if (!effectiveStudentId) {
      res.status(401).json({ error: 'Aluno não identificado.', errorCode: 'UNAUTHORIZED' });
      return;
    }

    const classes = findStudentClasses(effectiveStudentId);
    res.json({ classes });
  });

  // Student own performance or teacher access (with IDOR protection)
  app.get('/api/student/performance/:studentId', (req: Request, res: Response) => {
    const { studentId } = req.params;
    const auth = getAuthFromReq(req);
    const rawTeacher = req.headers['x-teacher-key'];
    const teacherKey = Array.isArray(rawTeacher) ? rawTeacher[0] : rawTeacher;
    const isTeacher = (teacherKey && teacherKey === TEACHER_PASSCODE) || (auth && auth.user.role === 'teacher');

    if (!isTeacher) {
      // Se não for professor, DEVE ser o próprio aluno autenticado
      if (!auth) {
        res.status(401).json({ error: 'Autenticação necessária.', errorCode: 'UNAUTHORIZED' });
        return;
      }
      if (auth.user.id !== studentId) {
        res.status(403).json({
          error: 'Acesso negado: você não tem permissão para visualizar o relatório pedagógico de outro aluno.',
          errorCode: 'FORBIDDEN',
        });
        return;
      }
    }

    const details = getStudentPerformanceDetails(studentId);
    if (!details) {
      res.status(404).json({ error: 'Aluno não encontrado.', errorCode: 'NOT_FOUND' });
      return;
    }

    res.json(details);
  });

  // Terminate authenticated session
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers['authorization'];
    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-session-token']) {
      token = String(req.headers['x-session-token']).trim();
    }
    if (token) {
      deleteSession(token);
    }
    res.json({ ok: true });
  });

  // Request password reset token (no user enumeration)
  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    try {
      const { email } = req.body || {};
      const result = requestPasswordReset(email);
      res.json({
        ok: true,
        message: 'Se o e-mail estiver cadastrado, as instruções para redefinição foram processadas.',
        ...(result.resetToken ? { resetToken: result.resetToken } : {}),
      });
    } catch {
      res.json({
        ok: true,
        message: 'Se o e-mail estiver cadastrado, as instruções para redefinição foram processadas.',
      });
    }
  });

  // Reset password using secure token
  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body || {};
      resetPasswordWithToken({ token, newPassword });
      res.json({ ok: true, message: 'Senha redefinida com sucesso.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao redefinir senha.', errorCode: 'INVALID_RESET_TOKEN' });
    }
  });

  // Update authenticated student profile (name, grade, className, school, onboarding)
  app.put('/api/auth/profile', (req: Request, res: Response) => {
    const auth = getAuthFromReq(req);
    if (!auth) {
      res.status(401).json({ error: 'Sessão não autenticada.', errorCode: 'UNAUTHORIZED' });
      return;
    }
    try {
      const { name, school, grade, className, photoUrl, onboardingCompleted } = req.body || {};
      const updatedUser = updateUserProfile(auth.user.id, {
        name,
        school,
        grade,
        className,
        photoUrl,
        onboardingCompleted,
      });
      res.json({ user: updatedUser });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao atualizar perfil.', errorCode: 'PROFILE_UPDATE_ERROR' });
    }
  });

  // ==========================================
  // AUTHORITATIVE API ROUTES
  // ==========================================

  // Get or initialize user state (authoritative lives and score)
  app.get('/api/user/session/:uid', (req: Request, res: Response) => {
    try {
      const { uid: paramUid } = req.params;
      const auth = getAuthFromReq(req);
      // O userId da sessão autenticada tem precedência autoritativa absoluta
      const effectiveUid = auth ? auth.user.id : paramUid;
      const session = getOrCreateSession(effectiveUid);
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
      const auth = getAuthFromReq(req);
      const { uid } = req.body;
      const effectiveUid = auth ? auth.user.id : (uid || 'anonymous');
      const session = resetUserSession(effectiveUid);
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
      const auth = getAuthFromReq(req);
      const { questionId, sectorId, uid, requestId: bodyReqId } = req.body;
      const requestId = (req.headers['x-request-id'] as string) || bodyReqId;
      const effectiveUid = auth ? auth.user.id : (uid || 'astronaut');

      if (!questionId || !sectorId) {
        res.status(400).json({ error: 'questionId e sectorId são obrigatórios.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = startQuestionAttempt(
        questionId,
        Number(sectorId) as SectorId,
        effectiveUid,
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
      const auth = getAuthFromReq(req);
      const { attemptId, selectedOptionId, usedHintLevel, uid, clientTimeLeft, requestId: bodyReqId } = req.body;
      const requestId = (req.headers['x-request-id'] as string) || bodyReqId;
      const effectiveUid = auth ? auth.user.id : (uid || 'astronaut');

      if (!attemptId || !selectedOptionId) {
        res.status(400).json({ error: 'attemptId e selectedOptionId são obrigatórios.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = submitQuestionAttempt({
        attemptId,
        selectedOptionId,
        usedHintLevel: usedHintLevel || 0,
        uid: effectiveUid,
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
      const auth = getAuthFromReq(req);
      const { missionId, uid, requestId: bodyReqId } = req.body;
      const requestId = (req.headers['x-request-id'] as string) || bodyReqId;
      const effectiveUid = auth ? auth.user.id : (uid || 'astronaut');

      if (!missionId) {
        res.status(400).json({ error: 'missionId é obrigatório.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = startEmergencyAttempt(missionId, effectiveUid, requestId);
      res.json(result);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Submit emergency mission answer (authoritative, combo-safe, idempotent)
  app.post('/api/timetrial/submit', (req: Request, res: Response) => {
    try {
      const auth = getAuthFromReq(req);
      const { attemptId, selectedOptionId, uid, comboCount, clientTimeLeft, requestId: bodyReqId } = req.body;
      const requestId = (req.headers['x-request-id'] as string) || bodyReqId;
      const effectiveUid = auth ? auth.user.id : (uid || 'astronaut');

      if (!attemptId || !selectedOptionId) {
        res.status(400).json({ error: 'attemptId e selectedOptionId são obrigatórios.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const result = submitEmergencyAttempt({
        attemptId,
        selectedOptionId,
        uid: effectiveUid,
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

  // Get authoritative pedagogical dashboard overview (Legacy compatibility)
  app.get('/api/teacher/overview', requireTeacherAuth, (_req: Request, res: Response) => {
    try {
      const overview = getTeacherDashboardOverview();
      res.json(overview);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Get authoritative pedagogical dashboard with filters & 8 Official KPIs (Phase 2)
  app.get('/api/teacher/dashboard', requireTeacherAuth, (req: Request, res: Response) => {
    try {
      const { classId, missionId, period } = req.query as {
        classId?: string;
        missionId?: string;
        period?: 'all' | '7d' | '30d' | '180d';
      };

      const dashboard = getTeacherDashboard({ classId, missionId, period });
      res.json(dashboard);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Get teacher students list with metrics
  app.get('/api/teacher/students', requireTeacherAuth, (req: Request, res: Response) => {
    try {
      const { classId } = req.query as { classId?: string };
      const dashboard = getTeacherDashboard({ classId });
      res.json({ students: dashboard.students, total: dashboard.students.length });
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Get student detailed performance for teacher
  app.get('/api/teacher/students/:studentId/performance', requireTeacherAuth, (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const details = getStudentPerformanceDetails(studentId);
      if (!details) {
        res.status(404).json({ error: 'Aluno não encontrado.', errorCode: 'NOT_FOUND' });
        return;
      }
      res.json(details);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Get attempt history with status filters
  app.get('/api/teacher/attempts', requireTeacherAuth, (req: Request, res: Response) => {
    try {
      const { classId, limit } = req.query as { classId?: string; limit?: string };
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const attempts = getTeacherAttemptsHistory({ classId, limit: parsedLimit });
      res.json({ attempts, total: attempts.length });
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Get questions analytics (error & success rates, questions needing review)
  app.get('/api/teacher/questions-analytics', requireTeacherAuth, (_req: Request, res: Response) => {
    try {
      const analytics = getQuestionsAnalytics();
      res.json(analytics);
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Teacher create new class
  app.post('/api/teacher/classes', requireTeacherAuth, (req: Request, res: Response) => {
    try {
      const auth = getAuthFromReq(req);
      const { name, code } = req.body || {};
      const teacherId = auth ? auth.user.id : 'prof_ares';

      if (!name || String(name).trim().length === 0) {
        res.status(400).json({ error: 'Nome da turma é obrigatório.', errorCode: 'INVALID_REQUEST' });
        return;
      }

      const newClass = createClass({
        teacherId,
        name: String(name),
        code: code ? String(code) : undefined,
      });

      res.json({ class: newClass, ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao criar turma.', errorCode: 'CREATE_CLASS_FAILED' });
    }
  });

  // Teacher list owned classes
  app.get('/api/teacher/classes', requireTeacherAuth, (req: Request, res: Response) => {
    try {
      const auth = getAuthFromReq(req);
      const teacherId = auth ? auth.user.id : 'prof_ares';
      const classes = findClassesByTeacher(teacherId);
      res.json({ classes });
    } catch (err: unknown) {
      const errInfo = classifyError(err);
      res.status(errInfo.status).json({ error: errInfo.message, errorCode: errInfo.errorCode });
    }
  });

  // Generic catch-all protection for administrative paths
  app.all('/api/admin/*', (_req: Request, res: Response) => {
    res.status(403).json({ error: 'Acesso restrito à administração da estação.', errorCode: 'FORBIDDEN' });
  });

  // Catch-all 404 for any unmatched /api/* route: GUARANTEES JSON (NEVER HTML)
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: `Endpoint ${req.method} ${req.path} não encontrado no servidor da estação orbital.`,
      errorCode: 'ENDPOINT_NOT_FOUND',
    });
  });

  // Express JSON Error Handler for malformed JSON bodies or unhandled API errors
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        error: 'Requisição inválida: formato JSON malformado.',
        errorCode: 'MALFORMED_JSON',
      });
      return;
    }
    if (req.path && req.path.startsWith('/api/')) {
      console.error('[API Unhandled Error]', err);
      res.status(500).json({
        error: 'Erro interno no servidor da estação orbital.',
        errorCode: 'INTERNAL_SERVER_ERROR',
      });
      return;
    }
    next(err);
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Missão Circuitos Elétricos 2.0 (Authoritative Persistent Engine) running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && PORT !== 3000) {
      console.warn(`[Rede] Porta ${PORT} já ocupada por proxy reverso. Vinculando na porta 3000...`);
      app.listen(3000, '0.0.0.0', () => {
        console.log(`Missão Circuitos Elétricos 2.0 (Authoritative Persistent Engine) running on http://0.0.0.0:3000`);
      });
    } else {
      throw err;
    }
  });
}

startServer();
