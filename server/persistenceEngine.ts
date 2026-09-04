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
`);

// Record schema version in meta table
db.exec(`
  INSERT OR REPLACE INTO meta (key, value, updatedAt)
  VALUES ('schema_version', '2.1.0', ${Date.now()});
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
