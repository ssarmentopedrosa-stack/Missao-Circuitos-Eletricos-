import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { SectorId } from '../src/types';

export const SERVER_VERSION = '2.1.0-authoritative-persistence';
export const STATE_VERSION = 1;
export const MAX_LIVES = 5;

// Data directory resolution
const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.join(DB_DIR, 'circuits_authoritative.db');

// Initialize SQLite database instance
export const db = new DatabaseSync(DB_PATH);

// -------------------------------------------------------------
// PRAGMAS & WAL MODE CONFIGURATION
// -------------------------------------------------------------
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

// -------------------------------------------------------------
// TABLES & INDEXES INITIALIZATION
// -------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    uid TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'GAME_OVER', 'VICTORY')),
    lives INTEGER NOT NULL CHECK (lives >= 0 AND lives <= 5),
    score INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    comboCount INTEGER NOT NULL DEFAULT 0,
    comboMultiplier REAL NOT NULL DEFAULT 1.0,
    currentPhase INTEGER NOT NULL DEFAULT 1,
    currentMission TEXT,
    currentQuestionId TEXT,
    completedSectors TEXT NOT NULL DEFAULT '[]',
    startedAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    createdAt INTEGER NOT NULL,
    lastActivityAt INTEGER NOT NULL,
    serverVersion TEXT NOT NULL,
    stateVersion INTEGER NOT NULL DEFAULT 1,
    lastRequestId TEXT
  );

  CREATE TABLE IF NOT EXISTS attempts (
    attemptId TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('question', 'emergency')),
    questionId TEXT,
    phaseId INTEGER,
    missionId TEXT,
    startedAt INTEGER NOT NULL,
    deadline INTEGER NOT NULL,
    timeAllowedSeconds INTEGER NOT NULL,
    answered INTEGER NOT NULL DEFAULT 0 CHECK (answered IN (0, 1)),
    answeredAt INTEGER,
    selectedOption TEXT,
    result TEXT,
    scoreAwarded INTEGER DEFAULT 0,
    xpAwarded INTEGER DEFAULT 0,
    lifeLost INTEGER DEFAULT 0,
    comboBefore INTEGER DEFAULT 0,
    comboAfter INTEGER DEFAULT 0,
    multiplier REAL DEFAULT 1.0,
    requestId TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS idx_attempts_uid ON attempts(uid);
  CREATE INDEX IF NOT EXISTS idx_attempts_deadline ON attempts(deadline);
  CREATE INDEX IF NOT EXISTS idx_attempts_requestId ON attempts(requestId);

  CREATE TABLE IF NOT EXISTS idempotency_keys (
    requestId TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    attemptId TEXT,
    responseBody TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expiresAt);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    category TEXT NOT NULL,
    uid TEXT,
    sessionId TEXT,
    attemptId TEXT,
    requestId TEXT,
    result TEXT,
    scoreChange INTEGER DEFAULT 0,
    livesChange INTEGER DEFAULT 0,
    errorCode TEXT,
    details TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_audit_uid ON audit_logs(uid);
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    passwordHash TEXT,
    photoUrl TEXT,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher')) DEFAULT 'student',
    provider TEXT NOT NULL CHECK (provider IN ('password', 'google')) DEFAULT 'password',
    providerId TEXT,
    school TEXT,
    grade TEXT,
    className TEXT,
    createdAt INTEGER NOT NULL,
    lastLoginAt INTEGER NOT NULL,
    lastActivityAt INTEGER NOT NULL,
    onboardingCompleted INTEGER NOT NULL DEFAULT 0 CHECK (onboardingCompleted IN (0, 1)),
    resetTokenHash TEXT,
    resetTokenExpires INTEGER,
    legacyUid TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, providerId);
  CREATE INDEX IF NOT EXISTS idx_users_legacyUid ON users(legacyUid);

  CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    role TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    lastUsedAt INTEGER NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_userId ON user_sessions(userId);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expiresAt);

  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    teacherId TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    createdAt INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(teacherId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacherId);
  CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(code);

  CREATE TABLE IF NOT EXISTS class_members (
    classId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    joinedAt INTEGER NOT NULL,
    PRIMARY KEY (classId, studentId),
    FOREIGN KEY(classId) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY(studentId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_class_members_student ON class_members(studentId);

  CREATE TABLE IF NOT EXISTS attempt_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attemptId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    questionId TEXT NOT NULL,
    selectedOptionId TEXT NOT NULL,
    isCorrect INTEGER NOT NULL CHECK (isCorrect IN (0, 1)),
    answeredAt INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attemptId);
  CREATE INDEX IF NOT EXISTS idx_attempt_answers_question ON attempt_answers(questionId);
  CREATE INDEX IF NOT EXISTS idx_attempt_answers_student ON attempt_answers(studentId);
`);

// Record schema version in meta table
db.exec(`
  INSERT OR REPLACE INTO meta (key, value, updatedAt)
  VALUES ('schema_version', '2.3.0', ${Date.now()});

  INSERT OR IGNORE INTO users (id, name, email, role, provider, createdAt, lastLoginAt, lastActivityAt, onboardingCompleted)
  VALUES ('prof_ares', 'Professor Ares', 'professor@ares3.edu', 'teacher', 'password', ${Date.now()}, ${Date.now()}, ${Date.now()}, 1);
`);

// -------------------------------------------------------------
// MODELS & INTERFACES
// -------------------------------------------------------------
export interface PersistedGameSession {
  uid: string;
  sessionId: string;
  status: 'ACTIVE' | 'GAME_OVER' | 'VICTORY';
  lives: number;
  score: number;
  xp: number;
  comboCount: number;
  comboMultiplier: number;
  currentPhase: number;
  currentMission?: string;
  currentQuestionId?: string;
  completedSectors: number[];
  startedAt: number;
  updatedAt: number;
  version: number;
  createdAt: number;
  lastActivityAt: number;
  serverVersion: string;
  stateVersion: number;
  lastRequestId?: string;
}

export interface PersistedAttempt {
  attemptId: string;
  uid: string;
  type: 'question' | 'emergency';
  questionId?: string;
  phaseId?: number;
  missionId?: string;
  startedAt: number;
  deadline: number;
  timeAllowedSeconds: number;
  answered: boolean;
  answeredAt?: number;
  selectedOption?: string;
  result?: string;
  scoreAwarded?: number;
  xpAwarded?: number;
  lifeLost?: number;
  comboBefore?: number;
  comboAfter?: number;
  multiplier?: number;
  requestId?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface AuditLogEntry {
  category:
    | 'STATE_CHANGE'
    | 'CONCURRENCY_CONFLICT'
    | 'REPLAY'
    | 'TIMEOUT'
    | 'GAME_OVER'
    | 'SECURITY_VIOLATION'
    | 'INVALID_ATTEMPT'
    | 'FORBIDDEN';
  uid?: string;
  sessionId?: string;
  attemptId?: string;
  requestId?: string;
  result?: string;
  scoreChange?: number;
  livesChange?: number;
  errorCode?: string;
  details?: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email?: string;
  passwordHash?: string;
  photoUrl?: string;
  role: 'student' | 'teacher';
  provider: 'password' | 'google';
  providerId?: string;
  school?: string;
  grade?: string;
  className?: string;
  createdAt: number;
  lastLoginAt: number;
  lastActivityAt: number;
  onboardingCompleted: boolean;
  resetTokenHash?: string;
  resetTokenExpires?: number;
  legacyUid?: string;
}

export type UserSanitized = Omit<UserRecord, 'passwordHash' | 'resetTokenHash' | 'resetTokenExpires'>;

export interface UserSessionRecord {
  token: string;
  userId: string;
  role: 'student' | 'teacher';
  expiresAt: number;
  createdAt: number;
  lastUsedAt: number;
}

// -------------------------------------------------------------
// DATABASE TRANSACTIONS WRAPPER
// -------------------------------------------------------------
export function runInTransaction<T>(action: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = action();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback errors if already aborted
    }
    throw err;
  }
}

// -------------------------------------------------------------
// AUDIT LOGGING
// -------------------------------------------------------------
const stmtInsertAudit = db.prepare(`
  INSERT INTO audit_logs (
    timestamp, category, uid, sessionId, attemptId, requestId, result,
    scoreChange, livesChange, errorCode, details
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export function logAudit(entry: AuditLogEntry): void {
  try {
    stmtInsertAudit.run(
      Date.now(),
      entry.category,
      entry.uid || null,
      entry.sessionId || null,
      entry.attemptId || null,
      entry.requestId || null,
      entry.result || null,
      entry.scoreChange || 0,
      entry.livesChange || 0,
      entry.errorCode || null,
      entry.details || null
    );
  } catch (err) {
    console.error('[AUDIT_LOG_ERROR]', err);
  }
}

// -------------------------------------------------------------
// SESSION / GAME CRUD & OPTIMISTIC CONCURRENCY
// -------------------------------------------------------------
const stmtGetGame = db.prepare(`SELECT * FROM games WHERE uid = ?`);
const stmtInsertGame = db.prepare(`
  INSERT INTO games (
    uid, sessionId, status, lives, score, xp, comboCount, comboMultiplier,
    currentPhase, currentMission, currentQuestionId, completedSectors,
    startedAt, updatedAt, version, createdAt, lastActivityAt, serverVersion,
    stateVersion, lastRequestId
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtUpdateGameWithVersion = db.prepare(`
  UPDATE games SET
    sessionId = ?, status = ?, lives = ?, score = ?, xp = ?, comboCount = ?, comboMultiplier = ?,
    currentPhase = ?, currentMission = ?, currentQuestionId = ?, completedSectors = ?,
    updatedAt = ?, version = version + 1, lastActivityAt = ?, serverVersion = ?,
    stateVersion = stateVersion + 1, lastRequestId = ?
  WHERE uid = ? AND version = ?
`);

export function getOrCreateSession(uid: string): PersistedGameSession {
  const row = stmtGetGame.get(uid) as Record<string, unknown> | undefined;
  if (row) {
    return parseGameRow(row);
  }

  const now = Date.now();
  const sessionId = `sess_${uid}_${now.toString(36)}`;
  const newGame: PersistedGameSession = {
    uid,
    sessionId,
    status: 'ACTIVE',
    lives: MAX_LIVES,
    score: 0,
    xp: 0,
    comboCount: 0,
    comboMultiplier: 1.0,
    currentPhase: 1,
    completedSectors: [],
    startedAt: now,
    updatedAt: now,
    version: 1,
    createdAt: now,
    lastActivityAt: now,
    serverVersion: SERVER_VERSION,
    stateVersion: 1,
  };

  stmtInsertGame.run(
    newGame.uid,
    newGame.sessionId,
    newGame.status,
    newGame.lives,
    newGame.score,
    newGame.xp,
    newGame.comboCount,
    newGame.comboMultiplier,
    newGame.currentPhase,
    newGame.currentMission || null,
    newGame.currentQuestionId || null,
    JSON.stringify(newGame.completedSectors),
    newGame.startedAt,
    newGame.updatedAt,
    newGame.version,
    newGame.createdAt,
    newGame.lastActivityAt,
    newGame.serverVersion,
    newGame.stateVersion,
    newGame.lastRequestId || null
  );

  logAudit({
    category: 'STATE_CHANGE',
    uid,
    sessionId,
    details: 'New authoritative session created and persisted',
  });

  return newGame;
}

export function saveSessionWithOcc(
  session: PersistedGameSession,
  expectedVersion: number
): PersistedGameSession {
  const now = Date.now();
  session.updatedAt = now;
  session.lastActivityAt = now;

  session.lives = Math.max(0, Math.min(MAX_LIVES, Math.floor(session.lives)));
  if (session.lives <= 0) {
    session.status = 'GAME_OVER';
  }

  const res = stmtUpdateGameWithVersion.run(
    session.sessionId,
    session.status,
    session.lives,
    session.score,
    session.xp,
    session.comboCount,
    session.comboMultiplier,
    session.currentPhase,
    session.currentMission || null,
    session.currentQuestionId || null,
    JSON.stringify(session.completedSectors),
    session.updatedAt,
    session.lastActivityAt,
    SERVER_VERSION,
    session.lastRequestId || null,
    session.uid,
    expectedVersion
  );

  if (Number(res.changes) === 0) {
    logAudit({
      category: 'CONCURRENCY_CONFLICT',
      uid: session.uid,
      details: `Conflict detected on session update. Expected version ${expectedVersion}.`,
    });
    throw new Error('CONCURRENCY_CONFLICT: Estado da sessão alterado por outra requisição concorrente.');
  }

  session.version = expectedVersion + 1;
  session.stateVersion += 1;
  return session;
}

export function resetUserSession(uid: string): PersistedGameSession {
  const session = getOrCreateSession(uid);
  const now = Date.now();
  session.lives = MAX_LIVES;
  session.score = 0;
  session.xp = 0;
  session.comboCount = 0;
  session.comboMultiplier = 1.0;
  session.completedSectors = [];
  session.status = 'ACTIVE';
  session.updatedAt = now;
  session.lastActivityAt = now;

  return saveSessionWithOcc(session, session.version);
}

// -------------------------------------------------------------
// ATTEMPTS CRUD
// -------------------------------------------------------------
const stmtGetAttempt = db.prepare(`SELECT * FROM attempts WHERE attemptId = ?`);
const stmtInsertAttempt = db.prepare(`
  INSERT INTO attempts (
    attemptId, uid, type, questionId, phaseId, missionId, startedAt,
    deadline, timeAllowedSeconds, answered, requestId, createdAt, updatedAt, version
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1)
`);

const stmtMarkAttemptAnswered = db.prepare(`
  UPDATE attempts SET
    answered = 1, answeredAt = ?, selectedOption = ?, result = ?,
    scoreAwarded = ?, xpAwarded = ?, lifeLost = ?, comboBefore = ?,
    comboAfter = ?, multiplier = ?, updatedAt = ?, version = version + 1
  WHERE attemptId = ? AND answered = 0
`);

export function saveNewAttempt(attempt: {
  attemptId: string;
  uid: string;
  type: 'question' | 'emergency';
  questionId?: string;
  phaseId?: number;
  missionId?: string;
  startedAt: number;
  deadline: number;
  timeAllowedSeconds: number;
  requestId?: string;
}): void {
  const now = Date.now();
  stmtInsertAttempt.run(
    attempt.attemptId,
    attempt.uid,
    attempt.type,
    attempt.questionId || null,
    attempt.phaseId || null,
    attempt.missionId || null,
    attempt.startedAt,
    attempt.deadline,
    attempt.timeAllowedSeconds,
    attempt.requestId || null,
    now,
    now
  );
}

export function getAttempt(attemptId: string): PersistedAttempt | null {
  const row = stmtGetAttempt.get(attemptId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return parseAttemptRow(row);
}

export function markAttemptAnswered(params: {
  attemptId: string;
  selectedOption: string;
  resultJson: string;
  scoreAwarded: number;
  xpAwarded: number;
  lifeLost: number;
  comboBefore: number;
  comboAfter: number;
  multiplier: number;
}): boolean {
  const now = Date.now();
  const res = stmtMarkAttemptAnswered.run(
    now,
    params.selectedOption,
    params.resultJson,
    params.scoreAwarded,
    params.xpAwarded,
    params.lifeLost,
    params.comboBefore,
    params.comboAfter,
    params.multiplier,
    now,
    params.attemptId
  );

  // Grava atomicamente na tabela de respostas detalhadas
  try {
    const attempt = getAttempt(params.attemptId);
    if (attempt && (attempt.questionId || attempt.missionId)) {
      const qId = attempt.questionId || attempt.missionId || 'unknown';
      const isCorr = Number(params.lifeLost) === 0 ? 1 : 0;
      db.prepare(`
        INSERT INTO attempt_answers (attemptId, studentId, questionId, selectedOptionId, isCorrect, answeredAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(params.attemptId, attempt.uid, qId, params.selectedOption, isCorr, now);
    }
  } catch {
    // Continua sem quebrar o fluxo principal se tabela estiver em transição
  }

  return Number(res.changes) > 0;
}

// -------------------------------------------------------------
// IDEMPOTENCY KEYS
// -------------------------------------------------------------
const stmtGetIdempotency = db.prepare(`
  SELECT responseBody, expiresAt FROM idempotency_keys WHERE requestId = ?
`);
const stmtInsertIdempotency = db.prepare(`
  INSERT OR REPLACE INTO idempotency_keys (
    requestId, uid, endpoint, attemptId, responseBody, createdAt, expiresAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export function getIdempotentResult(requestId: string): { body: unknown } | null {
  const row = stmtGetIdempotency.get(requestId) as { responseBody: string; expiresAt: number } | undefined;
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    return null;
  }
  try {
    return { body: JSON.parse(row.responseBody) };
  } catch {
    return null;
  }
}

export function saveIdempotentResult(params: {
  requestId: string;
  uid: string;
  endpoint: string;
  attemptId?: string;
  responseBody: unknown;
  ttlSeconds?: number;
}): void {
  const now = Date.now();
  const ttl = (params.ttlSeconds || 3600) * 1000;
  stmtInsertIdempotency.run(
    params.requestId,
    params.uid,
    params.endpoint,
    params.attemptId || null,
    JSON.stringify(params.responseBody),
    now,
    now + ttl
  );
}

// -------------------------------------------------------------
// MAINTENANCE & HEALTH
// -------------------------------------------------------------
export function pruneStaleAttempts(): void {
  const now = Date.now();
  db.exec(`DELETE FROM idempotency_keys WHERE expiresAt < ${now}`);
}

export function getDbHealth(): {
  status: 'ok' | 'error';
  journalMode: string;
  tables: string[];
  totalSessions: number;
  totalAttempts: number;
} {
  try {
    const journalRes = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    const tablesRes = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];
    const sessionsRes = db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number };
    const attemptsRes = db.prepare('SELECT COUNT(*) as count FROM attempts').get() as { count: number };

    return {
      status: 'ok',
      journalMode: journalRes?.journal_mode || 'unknown',
      tables: tablesRes.map((t) => t.name),
      totalSessions: sessionsRes?.count || 0,
      totalAttempts: attemptsRes?.count || 0,
    };
  } catch {
    return {
      status: 'error',
      journalMode: 'unknown',
      tables: [],
      totalSessions: 0,
      totalAttempts: 0,
    };
  }
}

// -------------------------------------------------------------
// ROW PARSERS
// -------------------------------------------------------------
function parseGameRow(row: Record<string, unknown>): PersistedGameSession {
  let completedSectors: number[] = [];
  try {
    completedSectors = JSON.parse(String(row.completedSectors || '[]'));
  } catch {
    completedSectors = [];
  }

  return {
    uid: String(row.uid),
    sessionId: String(row.sessionId),
    status: row.status as 'ACTIVE' | 'GAME_OVER' | 'VICTORY',
    lives: Number(row.lives),
    score: Number(row.score),
    xp: Number(row.xp),
    comboCount: Number(row.comboCount),
    comboMultiplier: Number(row.comboMultiplier),
    currentPhase: Number(row.currentPhase),
    currentMission: row.currentMission ? String(row.currentMission) : undefined,
    currentQuestionId: row.currentQuestionId ? String(row.currentQuestionId) : undefined,
    completedSectors,
    startedAt: Number(row.startedAt),
    updatedAt: Number(row.updatedAt),
    version: Number(row.version),
    createdAt: Number(row.createdAt),
    lastActivityAt: Number(row.lastActivityAt),
    serverVersion: String(row.serverVersion),
    stateVersion: Number(row.stateVersion),
    lastRequestId: row.lastRequestId ? String(row.lastRequestId) : undefined,
  };
}

function parseAttemptRow(row: Record<string, unknown>): PersistedAttempt {
  return {
    attemptId: String(row.attemptId),
    uid: String(row.uid),
    type: row.type as 'question' | 'emergency',
    questionId: row.questionId ? String(row.questionId) : undefined,
    phaseId: row.phaseId ? Number(row.phaseId) : undefined,
    missionId: row.missionId ? String(row.missionId) : undefined,
    startedAt: Number(row.startedAt),
    deadline: Number(row.deadline),
    timeAllowedSeconds: Number(row.timeAllowedSeconds),
    answered: Boolean(row.answered),
    answeredAt: row.answeredAt ? Number(row.answeredAt) : undefined,
    selectedOption: row.selectedOption ? String(row.selectedOption) : undefined,
    result: row.result ? String(row.result) : undefined,
    scoreAwarded: row.scoreAwarded !== null ? Number(row.scoreAwarded) : undefined,
    xpAwarded: row.xpAwarded !== null ? Number(row.xpAwarded) : undefined,
    lifeLost: row.lifeLost !== null ? Number(row.lifeLost) : undefined,
    comboBefore: row.comboBefore !== null ? Number(row.comboBefore) : undefined,
    comboAfter: row.comboAfter !== null ? Number(row.comboAfter) : undefined,
    multiplier: row.multiplier !== null ? Number(row.multiplier) : undefined,
    requestId: row.requestId ? String(row.requestId) : undefined,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
    version: Number(row.version),
  };
}

// -------------------------------------------------------------
// TEACHER & PEDAGOGICAL ANALYTICS (Phase 2)
// -------------------------------------------------------------
export const SECTOR_PEDAGOGICAL_NAMES: Record<number, string> = {
  1: '1ª Lei de Ohm e Condutores',
  2: '2ª Lei de Ohm e Resistividade',
  3: 'Associação em Série',
  4: 'Associação em Paralelo',
  5: 'Circuitos Mistos e Nós',
  6: 'Potência Elétrica e Joule',
  7: 'Geradores e Força Eletromotriz',
  8: 'Receptores e Rendimento',
  9: 'Leis de Kirchhoff e Wheatstone',
};

export interface TeacherDashboardFilters {
  classId?: string;
  missionId?: string;
  period?: 'all' | '7d' | '30d' | '180d';
}

export interface TeacherDashboardKpis {
  totalEnrolled: number;          // ALUNOS MATRICULADOS
  totalParticipated: number;        // ALUNOS QUE REALIZARAM
  totalPending: number;             // ALUNOS PENDENTES
  averageScore: number;             // MÉDIA
  accuracyPercentage: number;       // % DE ACERTOS
  averageResponseTimeSeconds: number; // TEMPO MÉDIO
  highestScore: number;             // MAIOR NOTA
  lowestScore: number;              // MENOR NOTA
}

export function getTeacherDashboard(filters: TeacherDashboardFilters = {}) {
  const period = filters.period || 'all';
  let cutoffTime = 0;
  const now = Date.now();
  if (period === '7d') cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
  else if (period === '30d') cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
  else if (period === '180d') cutoffTime = now - 180 * 24 * 60 * 60 * 1000;

  // 1. Obter alunos matriculados conforme filtro de turma
  let enrolledUsers: UserRecord[] = [];
  if (filters.classId && filters.classId !== 'all') {
    if (filters.classId === 'none') {
      // Alunos sem turma vinculada
      const rows = db.prepare(`
        SELECT u.* FROM users u
        WHERE u.role = 'student'
          AND u.id NOT IN (SELECT studentId FROM class_members)
        ORDER BY u.name ASC
      `).all() as Record<string, unknown>[];
      enrolledUsers = rows.map(parseUserRow);
    } else {
      const rows = db.prepare(`
        SELECT u.* FROM users u
        JOIN class_members cm ON u.id = cm.studentId
        WHERE cm.classId = ?
        ORDER BY u.name ASC
      `).all(filters.classId) as Record<string, unknown>[];
      enrolledUsers = rows.map(parseUserRow);
    }
  } else {
    // Todas as turmas: todos os alunos cadastrados
    const rows = db.prepare(`
      SELECT * FROM users WHERE role = 'student' ORDER BY name ASC
    `).all() as Record<string, unknown>[];
    enrolledUsers = rows.map(parseUserRow);
  }

  const enrolledUids = new Set(enrolledUsers.map((u) => u.id));

  // 2. Buscar todas as tentativas respondidas com filtros aplicados
  let attemptsQuery = `SELECT * FROM attempts WHERE answered = 1`;
  const queryParams: (string | number)[] = [];

  if (cutoffTime > 0) {
    attemptsQuery += ` AND answeredAt >= ?`;
    queryParams.push(cutoffTime);
  }

  if (filters.missionId && filters.missionId !== 'all') {
    const numPhase = Number(filters.missionId);
    if (!isNaN(numPhase) && numPhase >= 1 && numPhase <= 9) {
      attemptsQuery += ` AND phaseId = ?`;
      queryParams.push(numPhase);
    } else {
      attemptsQuery += ` AND (missionId = ? OR questionId LIKE ?)`;
      queryParams.push(filters.missionId, `%${filters.missionId}%`);
    }
  }

  attemptsQuery += ` ORDER BY answeredAt DESC`;
  const allAttempts = (db.prepare(attemptsQuery).all(...queryParams) as Record<string, unknown>[]).map(parseAttemptRow);

  // Filtrar tentativas pertencentes aos alunos matriculados se houver restrição
  const filteredAttempts = enrolledUids.size > 0
    ? allAttempts.filter((a) => enrolledUids.has(a.uid))
    : allAttempts;

  // 3. Buscar jogos correspondentes para pontuações e setores concluídos
  const gamesRows = (db.prepare(`SELECT * FROM games`).all() as Record<string, unknown>[]).map(parseGameRow);
  const gamesByUid = new Map(gamesRows.map((g) => [g.uid, g]));

  // 4. Mapear participação dos estudantes
  const participatedUids = new Set(filteredAttempts.map((a) => a.uid));

  // 5. Calcular os 8 KPIs oficiais
  const totalEnrolled = enrolledUsers.length;
  const totalParticipated = participatedUids.size;
  const totalPending = Math.max(0, totalEnrolled - totalParticipated);

  const totalQuestionsAnswered = filteredAttempts.length;
  const totalCorrect = filteredAttempts.filter((a) => Number(a.lifeLost) === 0).length;
  const accuracyPercentage = totalQuestionsAnswered > 0
    ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
    : 0;

  // Tempo médio por resposta (em segundos)
  let totalTimeSeconds = 0;
  let timedAttemptsCount = 0;
  for (const a of filteredAttempts) {
    if (a.answeredAt && a.startedAt && a.answeredAt > a.startedAt) {
      const elapsed = Math.round((a.answeredAt - a.startedAt) / 1000);
      if (elapsed > 0 && elapsed <= 600) {
        totalTimeSeconds += elapsed;
        timedAttemptsCount++;
      }
    }
  }
  const averageResponseTimeSeconds = timedAttemptsCount > 0
    ? Math.round(totalTimeSeconds / timedAttemptsCount)
    : 0;

  // Pontuações
  const scores: number[] = [];
  for (const uid of participatedUids) {
    const game = gamesByUid.get(uid);
    if (game) {
      scores.push(game.score);
    }
  }
  // Se nenhum realizou ainda mas há estudantes matriculados com score em games
  if (scores.length === 0 && enrolledUsers.length > 0) {
    for (const u of enrolledUsers) {
      const g = gamesByUid.get(u.id);
      if (g && g.score > 0) scores.push(g.score);
    }
  }

  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((acc, v) => acc + v, 0) / scores.length)
    : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

  const kpis: TeacherDashboardKpis = {
    totalEnrolled,
    totalParticipated,
    totalPending,
    averageScore,
    accuracyPercentage,
    averageResponseTimeSeconds,
    highestScore,
    lowestScore,
  };

  // 6. Lista de Estudantes consolidada para a tabela
  // Buscar turmas de cada aluno para exibição
  const studentClassMap = new Map<string, string>();
  const classMemberRows = db.prepare(`
    SELECT cm.studentId, c.name as className
    FROM class_members cm
    JOIN classes c ON cm.classId = c.id
  `).all() as { studentId: string; className: string }[];
  for (const cm of classMemberRows) {
    studentClassMap.set(cm.studentId, cm.className);
  }

  const studentsList = enrolledUsers.map((user) => {
    const userAttempts = filteredAttempts.filter((a) => a.uid === user.id);
    const totalAnswered = userAttempts.length;
    const correctCount = userAttempts.filter((a) => Number(a.lifeLost) === 0).length;
    const errorCount = totalAnswered - correctCount;
    const userAccuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    let userTimeSeconds = 0;
    let userTimedCount = 0;
    for (const a of userAttempts) {
      if (a.answeredAt && a.startedAt && a.answeredAt > a.startedAt) {
        const el = Math.round((a.answeredAt - a.startedAt) / 1000);
        if (el > 0 && el <= 600) {
          userTimeSeconds += el;
          userTimedCount++;
        }
      }
    }
    const avgTime = userTimedCount > 0 ? Math.round(userTimeSeconds / userTimedCount) : 0;

    const game = gamesByUid.get(user.id);
    const score = game ? game.score : 0;
    const lives = game ? game.lives : 5;
    const completedSectors = game ? game.completedSectors : [];
    const status = game ? game.status : 'ACTIVE';

    const className = studentClassMap.get(user.id) || user.className || 'Sem turma';

    return {
      id: user.id,
      name: user.name,
      email: user.email || '',
      className,
      school: user.school || '',
      grade: user.grade || '',
      score,
      lives,
      totalAnswered,
      correctCount,
      errorCount,
      accuracy: userAccuracy,
      averageResponseTimeSeconds: avgTime,
      completedSectors,
      status,
      hasParticipated: totalAnswered > 0,
      lastActivityAt: Math.max(user.lastActivityAt, game?.lastActivityAt || 0),
    };
  });

  // 7. Métricas detalhadas por Setor (1 a 9)
  const sectorMetrics: Array<{
    sectorId: number;
    sectorName: string;
    attemptsCount: number;
    correctCount: number;
    errorCount: number;
    accuracyPercent: number;
    avgTimeSeconds: number;
    needsIntervention: boolean;
  }> = [];

  for (let sId = 1; sId <= 9; sId++) {
    const sAttempts = filteredAttempts.filter((a) => Number(a.phaseId) === sId);
    const count = sAttempts.length;
    const sCorrect = sAttempts.filter((a) => Number(a.lifeLost) === 0).length;
    const sError = count - sCorrect;
    const acc = count > 0 ? Math.round((sCorrect / count) * 100) : 100;

    let sTime = 0;
    let sTimeCount = 0;
    for (const a of sAttempts) {
      if (a.answeredAt && a.startedAt && a.answeredAt > a.startedAt) {
        const el = Math.round((a.answeredAt - a.startedAt) / 1000);
        if (el > 0 && el <= 600) {
          sTime += el;
          sTimeCount++;
        }
      }
    }
    const sAvgTime = sTimeCount > 0 ? Math.round(sTime / sTimeCount) : 0;

    sectorMetrics.push({
      sectorId: sId,
      sectorName: SECTOR_PEDAGOGICAL_NAMES[sId] || `Setor ${sId}`,
      attemptsCount: count,
      correctCount: sCorrect,
      errorCount: sError,
      accuracyPercent: acc,
      avgTimeSeconds: sAvgTime,
      needsIntervention: count >= 3 && acc < 60,
    });
  }

  // 8. Eventos recentes de telemetria
  const recentEvents = filteredAttempts.slice(0, 25).map((a) => {
    const student = enrolledUsers.find((u) => u.id === a.uid);
    const elapsed = a.answeredAt && a.startedAt ? Math.round((a.answeredAt - a.startedAt) / 1000) : 0;
    return {
      attemptId: a.attemptId,
      studentId: a.uid,
      studentName: student ? student.name : 'Astronauta',
      type: a.type,
      questionId: a.questionId || a.missionId || 'n/a',
      sectorId: Number(a.phaseId || 1),
      sectorName: SECTOR_PEDAGOGICAL_NAMES[Number(a.phaseId || 1)] || 'Setor Orbital',
      isCorrect: Number(a.lifeLost) === 0,
      scoreAwarded: Number(a.scoreAwarded || 0),
      timeSpentSeconds: elapsed,
      timestamp: Number(a.answeredAt || a.startedAt),
    };
  });

  return {
    kpis,
    students: studentsList,
    sectorMetrics,
    recentEvents,
    filtersApplied: {
      classId: filters.classId || 'all',
      missionId: filters.missionId || 'all',
      period: filters.period || 'all',
    },
  };
}

// Mantido para compatibilidade total com chamadas legadas
export function getTeacherDashboardOverview() {
  const dash = getTeacherDashboard({ period: 'all' });
  return {
    classSummary: {
      totalStudents: dash.kpis.totalEnrolled,
      activeStudents: dash.students.filter((s) => s.status === 'ACTIVE').length,
      gameOverStudents: dash.students.filter((s) => s.status === 'GAME_OVER').length,
      totalQuestionsAnswered: dash.kpis.totalParticipated,
      totalCorrect: Math.round((dash.kpis.totalParticipated * dash.kpis.accuracyPercentage) / 100),
      totalErrors: 0,
      globalAccuracy: dash.kpis.accuracyPercentage,
      avgScore: dash.kpis.averageScore,
      databaseMode: 'SQLite-WAL-ACID',
      integrityCheck: 'ok',
    },
    sectorMetrics: dash.sectorMetrics,
    students: dash.students,
    recentEvents: dash.recentEvents,
  };
}

// -------------------------------------------------------------
// STUDENT INDIVIDUAL PERFORMANCE DETAILS
// -------------------------------------------------------------
export function getStudentPerformanceDetails(studentId: string) {
  const user = findUserById(studentId);
  if (!user) return null;

  const game = getOrCreateSession(studentId);
  const userAttempts = (db.prepare(`
    SELECT * FROM attempts WHERE uid = ? AND answered = 1 ORDER BY answeredAt DESC
  `).all(studentId) as Record<string, unknown>[]).map(parseAttemptRow);

  const totalAnswered = userAttempts.length;
  const correctCount = userAttempts.filter((a) => Number(a.lifeLost) === 0).length;
  const errorCount = totalAnswered - correctCount;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  let totalTime = 0;
  let timedCount = 0;
  for (const a of userAttempts) {
    if (a.answeredAt && a.startedAt && a.answeredAt > a.startedAt) {
      const el = Math.round((a.answeredAt - a.startedAt) / 1000);
      if (el > 0 && el <= 600) {
        totalTime += el;
        timedCount++;
      }
    }
  }
  const averageTimeSeconds = timedCount > 0 ? Math.round(totalTime / timedCount) : 0;

  // Detalhes por Setor para este aluno
  const sectorProgress: Array<{
    sectorId: number;
    sectorName: string;
    attemptsCount: number;
    correctCount: number;
    accuracyPercent: number;
    isCompleted: boolean;
  }> = [];

  const completedSectorsList = game ? Array.from(game.completedSectors) : [];

  for (let sId = 1; sId <= 9; sId++) {
    const secAttempts = userAttempts.filter((a) => Number(a.phaseId) === sId);
    const sCount = secAttempts.length;
    const sCorrect = secAttempts.filter((a) => Number(a.lifeLost) === 0).length;
    const sAcc = sCount > 0 ? Math.round((sCorrect / sCount) * 100) : 0;

    sectorProgress.push({
      sectorId: sId,
      sectorName: SECTOR_PEDAGOGICAL_NAMES[sId] || `Setor ${sId}`,
      attemptsCount: sCount,
      correctCount: sCorrect,
      accuracyPercent: sAcc,
      isCompleted: completedSectorsList.includes(sId as any),
    });
  }

  // Turmas do aluno
  const classes = findStudentClasses(studentId);

  // Tentativas recentes com dados da questão
  const recentAttempts = userAttempts.slice(0, 30).map((a) => ({
    attemptId: a.attemptId,
    questionId: a.questionId || a.missionId || 'n/a',
    phaseId: a.phaseId || 1,
    sectorName: SECTOR_PEDAGOGICAL_NAMES[a.phaseId || 1] || 'Setor Orbital',
    selectedOption: a.selectedOption,
    isCorrect: Number(a.lifeLost) === 0,
    scoreAwarded: a.scoreAwarded || 0,
    timeSpentSeconds: a.answeredAt && a.startedAt ? Math.round((a.answeredAt - a.startedAt) / 1000) : 0,
    answeredAt: a.answeredAt || a.startedAt,
  }));

  return {
    student: sanitizeUser(user),
    classes,
    summary: {
      score: game ? game.score : 0,
      lives: game ? game.lives : 5,
      status: game ? game.status : 'ACTIVE',
      totalAnswered,
      correctCount,
      errorCount,
      accuracy,
      averageTimeSeconds,
      completedSectorsCount: completedSectorsList.length,
    },
    sectorProgress,
    recentAttempts,
  };
}

// -------------------------------------------------------------
// QUESTIONS ANALYTICS ("Questões que exigem revisão")
// -------------------------------------------------------------
export function getQuestionsAnalytics() {
  // Unifica tentativas de attempts com answered = 1
  const rows = db.prepare(`
    SELECT 
      COALESCE(questionId, missionId) as qId,
      phaseId,
      COUNT(*) as totalAttempts,
      SUM(CASE WHEN lifeLost = 0 THEN 1 ELSE 0 END) as correctCount,
      SUM(CASE WHEN lifeLost > 0 THEN 1 ELSE 0 END) as errorCount,
      AVG(CASE WHEN answeredAt > startedAt THEN (answeredAt - startedAt) / 1000.0 ELSE NULL END) as avgTimeSeconds
    FROM attempts
    WHERE answered = 1 AND (questionId IS NOT NULL OR missionId IS NOT NULL)
    GROUP BY COALESCE(questionId, missionId), phaseId
    ORDER BY errorCount DESC, totalAttempts DESC
  `).all() as {
    qId: string;
    phaseId: number | null;
    totalAttempts: number;
    correctCount: number;
    errorCount: number;
    avgTimeSeconds: number | null;
  }[];

  const items = rows.map((r) => {
    const total = Number(r.totalAttempts);
    const err = Number(r.errorCount);
    const corr = Number(r.correctCount);
    const errRate = total > 0 ? Math.round((err / total) * 100) : 0;
    const corrRate = total > 0 ? Math.round((corr / total) * 100) : 0;
    const sId = Number(r.phaseId || 1);

    return {
      questionId: String(r.qId),
      sectorId: sId,
      sectorName: SECTOR_PEDAGOGICAL_NAMES[sId] || `Setor ${sId}`,
      totalAttempts: total,
      errorCount: err,
      correctCount: corr,
      errorRatePercentage: errRate,
      correctRatePercentage: corrRate,
      averageTimeSeconds: r.avgTimeSeconds ? Math.round(Number(r.avgTimeSeconds)) : 0,
      needsReview: errRate >= 50 && total >= 2,
    };
  });

  // Lista específica das que exigem revisão urgente
  const questionsNeedingReview = items.filter((q) => q.needsReview);

  return {
    totalAnalyzedQuestions: items.length,
    questionsNeedingReview,
    allQuestions: items,
  };
}

// -------------------------------------------------------------
// TEACHER ATTEMPTS LOG / HISTORY
// -------------------------------------------------------------
export function getTeacherAttemptsHistory(params: { classId?: string; limit?: number }) {
  const limit = Math.min(100, Math.max(10, params.limit || 50));
  let query = `
    SELECT a.*, u.name as studentName, u.email as studentEmail
    FROM attempts a
    LEFT JOIN users u ON a.uid = u.id
  `;
  const args: (string | number)[] = [];

  if (params.classId && params.classId !== 'all') {
    query += `
      JOIN class_members cm ON a.uid = cm.studentId
      WHERE cm.classId = ?
    `;
    args.push(params.classId);
  }

  query += ` ORDER BY a.startedAt DESC LIMIT ?`;
  args.push(limit);

  const rows = db.prepare(query).all(...args) as (Record<string, unknown> & {
    studentName?: string;
    studentEmail?: string;
  })[];

  const now = Date.now();

  return rows.map((row) => {
    const attempt = parseAttemptRow(row);
    let status: 'COMPLETED' | 'IN_PROGRESS' | 'TIMEOUT' | 'ABANDONED' = 'IN_PROGRESS';
    if (attempt.answered) {
      status = 'COMPLETED';
    } else if (now > attempt.deadline) {
      status = 'TIMEOUT';
    }

    const elapsedSeconds = attempt.answeredAt && attempt.startedAt
      ? Math.round((attempt.answeredAt - attempt.startedAt) / 1000)
      : (status === 'TIMEOUT' ? attempt.timeAllowedSeconds : Math.round((now - attempt.startedAt) / 1000));

    return {
      attemptId: attempt.attemptId,
      studentId: attempt.uid,
      studentName: row.studentName || 'Astronauta',
      studentEmail: row.studentEmail || '',
      missionId: attempt.missionId || (attempt.phaseId ? `Setor ${attempt.phaseId}` : 'Missão Orbital'),
      questionId: attempt.questionId,
      type: attempt.type,
      startedAt: attempt.startedAt,
      finishedAt: attempt.answeredAt,
      score: attempt.scoreAwarded || 0,
      isCorrect: attempt.answered ? Number(attempt.lifeLost) === 0 : false,
      elapsedSeconds,
      status,
    };
  });
}

// -------------------------------------------------------------
// CLASSES & CLASS MEMBERS MANAGEMENT (Phase 2)
// -------------------------------------------------------------
export interface ClassRecord {
  id: string;
  teacherId: string;
  name: string;
  code: string;
  createdAt: number;
  active: boolean;
  studentCount?: number;
}

export function generateClassCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3);
  const prefix = clean.length >= 2 ? clean : 'CIR';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
}

export function createClass(params: {
  teacherId: string;
  name: string;
  code?: string;
}): ClassRecord {
  if (!params.teacherId || !params.name || params.name.trim().length === 0) {
    throw new Error('Identificação do professor e nome da turma são obrigatórios.');
  }

  const id = `cls_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  let code = (params.code || '').trim().toUpperCase();
  if (!code) {
    code = generateClassCode(params.name);
  }

  // Verifica unicidade do código
  const existing = findClassByCode(code);
  if (existing) {
    code = `${code}-${Math.floor(10 + Math.random() * 90)}`;
  }

  const now = Date.now();
  db.prepare(`
    INSERT INTO classes (id, teacherId, name, code, createdAt, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, params.teacherId, params.name.trim(), code, now);

  return {
    id,
    teacherId: params.teacherId,
    name: params.name.trim(),
    code,
    createdAt: now,
    active: true,
    studentCount: 0,
  };
}

export function findClassByCode(code: string): ClassRecord | null {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  const row = db.prepare(`SELECT * FROM classes WHERE UPPER(code) = ? AND active = 1`).get(clean) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    teacherId: String(row.teacherId),
    name: String(row.name),
    code: String(row.code),
    createdAt: Number(row.createdAt),
    active: Boolean(row.active),
  };
}

export function findClassesByTeacher(teacherId: string): ClassRecord[] {
  if (!teacherId) return [];
  const rows = db.prepare(`
    SELECT c.*, COUNT(cm.studentId) as studentCount
    FROM classes c
    LEFT JOIN class_members cm ON c.id = cm.classId
    WHERE c.teacherId = ? AND c.active = 1
    GROUP BY c.id
    ORDER BY c.createdAt DESC
  `).all(teacherId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    teacherId: String(r.teacherId),
    name: String(r.name),
    code: String(r.code),
    createdAt: Number(r.createdAt),
    active: Boolean(r.active),
    studentCount: Number(r.studentCount || 0),
  }));
}

export function findStudentClasses(studentId: string): ClassRecord[] {
  if (!studentId) return [];
  const rows = db.prepare(`
    SELECT c.*
    FROM classes c
    JOIN class_members cm ON c.id = cm.classId
    WHERE cm.studentId = ? AND c.active = 1
    ORDER BY cm.joinedAt DESC
  `).all(studentId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    teacherId: String(r.teacherId),
    name: String(r.name),
    code: String(r.code),
    createdAt: Number(r.createdAt),
    active: Boolean(r.active),
  }));
}

export function joinClass(params: {
  studentId: string;
  code: string;
}): { classItem: ClassRecord; message: string } {
  if (!params.studentId || !params.code) {
    throw new Error('Código da turma é obrigatório.');
  }

  const classItem = findClassByCode(params.code);
  if (!classItem) {
    throw new Error('Código de turma inválido ou turma inativa.');
  }

  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO class_members (classId, studentId, joinedAt)
    VALUES (?, ?, ?)
  `).run(classItem.id, params.studentId, now);

  // Atualiza também className no perfil do usuário se estiver vazio
  try {
    const u = findUserById(params.studentId);
    if (u && !u.className) {
      updateUser(params.studentId, { className: classItem.name });
    }
  } catch {
    // ignore
  }

  return {
    classItem,
    message: `Você entrou na turma ${classItem.name} com sucesso!`,
  };
}

// -------------------------------------------------------------
// USER & SESSION REPOSITORY METHODS
// -------------------------------------------------------------
const stmtInsertUser = db.prepare(`
  INSERT INTO users (
    id, name, email, passwordHash, photoUrl, role, provider, providerId,
    school, grade, className, createdAt, lastLoginAt, lastActivityAt,
    onboardingCompleted, resetTokenHash, resetTokenExpires, legacyUid
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtGetUserById = db.prepare(`SELECT * FROM users WHERE id = ?`);
const stmtGetUserByEmail = db.prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`);
const stmtGetUserByProvider = db.prepare(`SELECT * FROM users WHERE provider = ? AND providerId = ?`);

const stmtInsertSession = db.prepare(`
  INSERT INTO user_sessions (token, userId, role, expiresAt, createdAt, lastUsedAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const stmtGetSession = db.prepare(`
  SELECT s.token, s.userId, s.role, s.expiresAt, s.createdAt, s.lastUsedAt,
         u.id as u_id, u.name as u_name, u.email as u_email, u.photoUrl as u_photoUrl,
         u.role as u_role, u.provider as u_provider, u.providerId as u_providerId,
         u.school as u_school, u.grade as u_grade, u.className as u_className,
         u.createdAt as u_createdAt, u.lastLoginAt as u_lastLoginAt, u.lastActivityAt as u_lastActivityAt,
         u.onboardingCompleted as u_onboardingCompleted, u.legacyUid as u_legacyUid
  FROM user_sessions s
  JOIN users u ON s.userId = u.id
  WHERE s.token = ?
`);

const stmtUpdateSessionUsed = db.prepare(`
  UPDATE user_sessions SET lastUsedAt = ? WHERE token = ?
`);

const stmtDeleteSession = db.prepare(`DELETE FROM user_sessions WHERE token = ?`);
const stmtDeleteUserSessions = db.prepare(`DELETE FROM user_sessions WHERE userId = ?`);

export function sanitizeUser(user: UserRecord): UserSanitized {
  const { passwordHash, resetTokenHash, resetTokenExpires, ...sanitized } = user;
  return sanitized;
}

export function parseUserRow(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    email: row.email ? String(row.email) : undefined,
    passwordHash: row.passwordHash ? String(row.passwordHash) : undefined,
    photoUrl: row.photoUrl ? String(row.photoUrl) : undefined,
    role: (row.role as 'student' | 'teacher') || 'student',
    provider: (row.provider as 'password' | 'google') || 'password',
    providerId: row.providerId ? String(row.providerId) : undefined,
    school: row.school ? String(row.school) : undefined,
    grade: row.grade ? String(row.grade) : undefined,
    className: row.className ? String(row.className) : undefined,
    createdAt: Number(row.createdAt),
    lastLoginAt: Number(row.lastLoginAt),
    lastActivityAt: Number(row.lastActivityAt),
    onboardingCompleted: Boolean(row.onboardingCompleted),
    resetTokenHash: row.resetTokenHash ? String(row.resetTokenHash) : undefined,
    resetTokenExpires: row.resetTokenExpires ? Number(row.resetTokenExpires) : undefined,
    legacyUid: row.legacyUid ? String(row.legacyUid) : undefined,
  };
}

export function createUser(params: {
  id: string;
  name: string;
  email?: string;
  passwordHash?: string;
  photoUrl?: string;
  role?: 'student' | 'teacher';
  provider: 'password' | 'google';
  providerId?: string;
  school?: string;
  grade?: string;
  className?: string;
  onboardingCompleted?: boolean;
  legacyUid?: string;
}): UserSanitized {
  const now = Date.now();
  const normalizedEmail = params.email ? params.email.trim().toLowerCase() : null;
  const role = params.role || 'student';

  stmtInsertUser.run(
    params.id,
    params.name.trim(),
    normalizedEmail,
    params.passwordHash || null,
    params.photoUrl || null,
    role,
    params.provider,
    params.providerId || null,
    params.school ? params.school.trim() : null,
    params.grade ? params.grade.trim() : null,
    params.className ? params.className.trim() : null,
    now,
    now,
    now,
    params.onboardingCompleted ? 1 : 0,
    null,
    null,
    params.legacyUid || null
  );

  const full = findUserById(params.id);
  if (!full) {
    throw new Error('Falha ao persistir usuário.');
  }
  return sanitizeUser(full);
}

export function findUserById(id: string): UserRecord | null {
  const row = stmtGetUserById.get(id) as Record<string, unknown> | undefined;
  return row ? parseUserRow(row) : null;
}

export function findUserByEmail(email: string): UserRecord | null {
  const normalized = email.trim().toLowerCase();
  const row = stmtGetUserByEmail.get(normalized) as Record<string, unknown> | undefined;
  return row ? parseUserRow(row) : null;
}

export function findUserByProvider(provider: 'password' | 'google', providerId: string): UserRecord | null {
  const row = stmtGetUserByProvider.get(provider, providerId) as Record<string, unknown> | undefined;
  return row ? parseUserRow(row) : null;
}

export function updateUser(
  id: string,
  updates: Partial<Pick<
    UserRecord,
    'name' | 'photoUrl' | 'school' | 'grade' | 'className' |
    'onboardingCompleted' | 'lastLoginAt' | 'lastActivityAt' |
    'passwordHash' | 'resetTokenHash' | 'resetTokenExpires'
  >>
): UserSanitized | null {
  const existing = findUserById(id);
  if (!existing) return null;

  const now = Date.now();
  const sets: string[] = ['lastActivityAt = ?'];
  const values: (string | number | null)[] = [updates.lastActivityAt || now];

  if (updates.name !== undefined) {
    sets.push('name = ?');
    values.push(updates.name.trim());
  }
  if (updates.photoUrl !== undefined) {
    sets.push('photoUrl = ?');
    values.push(updates.photoUrl);
  }
  if (updates.school !== undefined) {
    sets.push('school = ?');
    values.push(updates.school?.trim() || null);
  }
  if (updates.grade !== undefined) {
    sets.push('grade = ?');
    values.push(updates.grade?.trim() || null);
  }
  if (updates.className !== undefined) {
    sets.push('className = ?');
    values.push(updates.className?.trim() || null);
  }
  if (updates.onboardingCompleted !== undefined) {
    sets.push('onboardingCompleted = ?');
    values.push(updates.onboardingCompleted ? 1 : 0);
  }
  if (updates.lastLoginAt !== undefined) {
    sets.push('lastLoginAt = ?');
    values.push(updates.lastLoginAt);
  }
  if (updates.passwordHash !== undefined) {
    sets.push('passwordHash = ?');
    values.push(updates.passwordHash);
  }
  if (updates.resetTokenHash !== undefined) {
    sets.push('resetTokenHash = ?');
    values.push(updates.resetTokenHash);
  }
  if (updates.resetTokenExpires !== undefined) {
    sets.push('resetTokenExpires = ?');
    values.push(updates.resetTokenExpires);
  }

  values.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  const updated = findUserById(id);
  return updated ? sanitizeUser(updated) : null;
}

export function createSession(
  userId: string,
  role: 'student' | 'teacher',
  token: string,
  ttlMs: number = 30 * 24 * 60 * 60 * 1000 // 30 dias de sessão persistente
): UserSessionRecord {
  const now = Date.now();
  const expiresAt = now + ttlMs;

  stmtInsertSession.run(token, userId, role, expiresAt, now, now);

  return {
    token,
    userId,
    role,
    expiresAt,
    createdAt: now,
    lastUsedAt: now,
  };
}

export function findSessionByToken(token: string): { session: UserSessionRecord; user: UserSanitized } | null {
  if (!token) return null;
  const row = stmtGetSession.get(token) as Record<string, unknown> | undefined;
  if (!row) return null;

  const expiresAt = Number(row.expiresAt);
  if (Date.now() > expiresAt) {
    stmtDeleteSession.run(token);
    return null;
  }

  stmtUpdateSessionUsed.run(Date.now(), token);

  const session: UserSessionRecord = {
    token: String(row.token),
    userId: String(row.userId),
    role: (row.role as 'student' | 'teacher') || 'student',
    expiresAt,
    createdAt: Number(row.createdAt),
    lastUsedAt: Date.now(),
  };

  const user: UserSanitized = {
    id: String(row.u_id),
    name: String(row.u_name),
    email: row.u_email ? String(row.u_email) : undefined,
    photoUrl: row.u_photoUrl ? String(row.u_photoUrl) : undefined,
    role: (row.u_role as 'student' | 'teacher') || 'student',
    provider: (row.u_provider as 'password' | 'google') || 'password',
    providerId: row.u_providerId ? String(row.u_providerId) : undefined,
    school: row.u_school ? String(row.u_school) : undefined,
    grade: row.u_grade ? String(row.u_grade) : undefined,
    className: row.u_className ? String(row.u_className) : undefined,
    createdAt: Number(row.u_createdAt),
    lastLoginAt: Number(row.u_lastLoginAt),
    lastActivityAt: Number(row.u_lastActivityAt),
    onboardingCompleted: Boolean(row.u_onboardingCompleted),
    legacyUid: row.u_legacyUid ? String(row.u_legacyUid) : undefined,
  };

  return { session, user };
}

export function deleteSession(token: string): void {
  if (!token) return;
  stmtDeleteSession.run(token);
}

export function deleteUserSessions(userId: string): void {
  if (!userId) return;
  stmtDeleteUserSessions.run(userId);
}

const stmtGetUserByResetToken = db.prepare(`
  SELECT * FROM users
  WHERE resetTokenHash = ? AND resetTokenExpires > ?
`);

export function findUserByResetTokenHash(tokenHash: string, now: number): UserRecord | null {
  const row = stmtGetUserByResetToken.get(tokenHash, now) as Record<string, unknown> | undefined;
  return row ? parseUserRow(row) : null;
}


