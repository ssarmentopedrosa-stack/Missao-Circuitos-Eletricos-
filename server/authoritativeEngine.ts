import { Question, QuestionPublic, QuestionAttempt, AttemptSubmissionResult, SectorId, QuestionOption } from '../src/types';
import { ALL_QUESTIONS } from '../src/data/questions';
import { EMERGENCY_MISSIONS } from '../src/data/emergencyMissions';
import { calculateMissionScore, ScoreCalculationResult } from '../src/services/gamificationService';
import { diagnoseErrorType } from '../src/utils/circuitCalculations';
import {
  getOrCreateSession as dbGetOrCreateSession,
  saveSessionWithOcc,
  resetUserSession as dbResetUserSession,
  saveNewAttempt,
  getAttempt,
  markAttemptAnswered,
  getIdempotentResult,
  saveIdempotentResult,
  runInTransaction,
  logAudit,
  pruneStaleAttempts as dbPruneStale,
  MAX_LIVES,
} from './persistenceEngine';

export { MAX_LIVES };

// -------------------------------------------------------------
// TYPES & INTERFACES (Conforming to P0.4.4 Master Spec)
// -------------------------------------------------------------
export interface EmergencyAttempt {
  attemptId: string;
  missionId: string;
  uid: string;
  startedAt: number;
  deadlineAt: number;
  timeLimit: number;
  answered: boolean;
  selectedOptionId?: string;
  isCorrect?: boolean;
}

export interface EmergencySubmissionResult {
  attemptId: string;
  isCorrect: boolean;
  isTimeout: boolean;
  livesRemaining: number;
  totalScore: number;
  scoreResult?: ScoreCalculationResult;
  errorDiagnosis?: { type: 'conceptual' | 'calculation' | 'unit' | 'interpretation'; explanation: string };
  expectedValue: number;
}

export interface UserSessionState {
  uid: string;
  lives: number;
  score: number;
  completedSectors: Set<SectorId>;
  lastSubmissionTimestamp: number;
  version?: number;
}

// -------------------------------------------------------------
// ADAPTER HELPERS (PERSISTENT DB <-> SESSION STATE)
// -------------------------------------------------------------
export function getOrCreateSession(uid: string): UserSessionState {
  const persisted = dbGetOrCreateSession(uid);
  return {
    uid: persisted.uid,
    lives: persisted.lives,
    score: persisted.score,
    completedSectors: new Set<SectorId>(persisted.completedSectors as SectorId[]),
    lastSubmissionTimestamp: persisted.lastActivityAt,
    version: persisted.version,
  };
}

export function resetUserSession(uid: string): UserSessionState {
  const persisted = dbResetUserSession(uid);
  return {
    uid: persisted.uid,
    lives: persisted.lives,
    score: persisted.score,
    completedSectors: new Set<SectorId>(persisted.completedSectors as SectorId[]),
    lastSubmissionTimestamp: persisted.lastActivityAt,
    version: persisted.version,
  };
}

// Convert Question to QuestionPublic (strip out private correctAnswer)
export function sanitizeQuestionForPublic(question: Question): QuestionPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { correctAnswer, ...publicQuestion } = question;
  return publicQuestion;
}

// Fisher-Yates safe shuffle for options
export function randomizeQuestionOptions(options: QuestionOption[]): QuestionOption[] {
  const cloned = [...options];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

// Generate unique attempt token
function generateAttemptId(questionId: string, uid: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  return `att_${uid.replace(/[^a-zA-Z0-9]/g, '')}_${questionId}_${timePart}_${randomPart}`;
}

// -------------------------------------------------------------
// QUESTION ATTEMPT LOGIC (PERSISTENT & AUTHORITATIVE)
// -------------------------------------------------------------
export function startQuestionAttempt(
  questionId: string,
  sectorId: SectorId,
  uid: string,
  requestId?: string
): { attempt: QuestionAttempt; questionPublic: QuestionPublic } {
  if (requestId) {
    const cached = getIdempotentResult(requestId);
    if (cached && cached.body) {
      return cached.body as { attempt: QuestionAttempt; questionPublic: QuestionPublic };
    }
  }

  const session = dbGetOrCreateSession(uid);
  if (session.lives <= 0) {
    logAudit({
      category: 'GAME_OVER',
      uid,
      requestId,
      details: 'Attempted to start question with 0 lives',
    });
    throw new Error('Vidas esgotadas (Game Over). Reinicie a partida para continuar.');
  }

  const sectorList = ALL_QUESTIONS[sectorId] || [];
  const fullQuestion = sectorList.find((q) => q.id === questionId);
  if (!fullQuestion) {
    logAudit({
      category: 'INVALID_ATTEMPT',
      uid,
      details: `Question id "${questionId}" not found in sector ${sectorId}`,
    });
    throw new Error(`Questão com id "${questionId}" não encontrada no setor ${sectorId}.`);
  }

  const now = Date.now();
  const timeAllowedSeconds = fullQuestion.timeSeconds || 120;
  // 3000ms latency tolerance buffer baked into authoritative deadline
  const deadlineAt = now + timeAllowedSeconds * 1000 + 3000;
  const attemptId = generateAttemptId(questionId, uid);

  const attempt: QuestionAttempt = {
    attemptId,
    questionId,
    sectorId,
    uid,
    startedAt: now,
    deadlineAt,
    timeAllowedSeconds,
    usedHintLevel: 0,
    answered: false,
  };

  saveNewAttempt({
    attemptId,
    uid,
    type: 'question',
    questionId,
    phaseId: Number(sectorId),
    startedAt: now,
    deadline: deadlineAt,
    timeAllowedSeconds,
    requestId,
  });

  const questionPublic = sanitizeQuestionForPublic(fullQuestion);
  const responseData = { attempt, questionPublic };

  if (requestId) {
    saveIdempotentResult({
      requestId,
      uid,
      endpoint: '/api/attempt/start',
      attemptId,
      responseBody: responseData,
    });
  }

  logAudit({
    category: 'STATE_CHANGE',
    uid,
    attemptId,
    requestId,
    details: `Question attempt started for ${questionId}`,
  });

  return responseData;
}

export function submitQuestionAttempt(params: {
  attemptId: string;
  selectedOptionId: string;
  usedHintLevel?: 0 | 1 | 2 | 3;
  uid?: string;
  requestId?: string;
  clientTimeLeft?: number;
}): AttemptSubmissionResult {
  const {
    attemptId,
    selectedOptionId,
    usedHintLevel = 0,
    uid = 'anonymous_astronaut',
    requestId,
  } = params;

  if (requestId) {
    const cached = getIdempotentResult(requestId);
    if (cached && cached.body) {
      return cached.body as AttemptSubmissionResult;
    }
  }

  const persistedAttempt = getAttempt(attemptId);
  if (!persistedAttempt) {
    logAudit({
      category: 'INVALID_ATTEMPT',
      uid,
      attemptId,
      requestId,
      errorCode: 'ATTEMPT_NOT_FOUND',
      details: 'Attempt does not exist in database',
    });
    throw new Error('Tentativa inválida ou expirada. Inicie a questão novamente.');
  }

  if (persistedAttempt.uid && uid && persistedAttempt.uid !== uid) {
    logAudit({
      category: 'FORBIDDEN',
      uid,
      attemptId,
      requestId,
      errorCode: 'FORBIDDEN',
      details: `Cross-user attempt access: attempt owned by ${persistedAttempt.uid}, requested by ${uid}`,
    });
    throw new Error('Tentativa pertence a outro usuário.');
  }

  if (persistedAttempt.answered && persistedAttempt.result) {
    logAudit({
      category: 'REPLAY',
      uid,
      attemptId,
      requestId,
      details: 'Idempotent replay of previously answered question attempt',
    });
    return JSON.parse(persistedAttempt.result) as AttemptSubmissionResult;
  }

  return runInTransaction(() => {
    const attempt = getAttempt(attemptId);
    if (!attempt) {
      throw new Error('Tentativa inválida ou expirada.');
    }
    if (attempt.answered && attempt.result) {
      return JSON.parse(attempt.result) as AttemptSubmissionResult;
    }

    const now = Date.now();
    const session = dbGetOrCreateSession(attempt.uid || uid);

    if (session.lives <= 0) {
      logAudit({
        category: 'GAME_OVER',
        uid,
        attemptId,
        details: 'Attempted to submit answer with 0 lives',
      });
      throw new Error('Vidas esgotadas (Game Over). Reinicie a partida para continuar.');
    }

    const sectorList = ALL_QUESTIONS[(attempt.phaseId as SectorId) || 1] || [];
    const question = sectorList.find((q) => q.id === attempt.questionId);
    if (!question) {
      throw new Error('Questão autoritativa não localizada no servidor.');
    }

    const isTimeout = now > attempt.deadline;
    const isCorrect =
      !isTimeout && selectedOptionId.toUpperCase() === question.correctAnswer.toUpperCase();

    let scoreAwarded = 0;
    let lifeLost = 0;
    let feedbackMessage = '';

    if (isCorrect) {
      const basePoints = question.basePoints || 100;
      const hintPenalty =
        usedHintLevel === 3 ? 0.5 : usedHintLevel === 2 ? 0.7 : usedHintLevel === 1 ? 0.85 : 1.0;

      const elapsedSeconds = Math.max(0, Math.floor((now - attempt.startedAt) / 1000));
      const serverRemainingSeconds = Math.max(0, question.timeSeconds - elapsedSeconds);
      const speedBonus = Math.min(question.timeSeconds * 2, serverRemainingSeconds * 2);

      scoreAwarded = Math.round(basePoints * hintPenalty + speedBonus);
      session.score += scoreAwarded;
      session.xp += scoreAwarded;

      feedbackMessage = `Diagnóstico impecável! A corrente e a tensão foram recalculadas e os instrumentos do ${question.topic} voltaram ao verde!`;
    } else {
      lifeLost = 1;
      session.lives = Math.max(0, session.lives - 1);
      scoreAwarded = 0;

      if (isTimeout) {
        feedbackMessage =
          'O tempo limite esgotou-se antes da estabilização dos circuitos. A estação perdeu 1 vida de reserva.';
      } else {
        feedbackMessage =
          'A corrente no circuito apresentou anomalia com essa alternativa. O sistema perdeu 1 vida de reserva.';
      }
    }

    saveSessionWithOcc(session, session.version);

    const result: AttemptSubmissionResult = {
      attemptId,
      isCorrect,
      isTimeout,
      livesRemaining: session.lives,
      scoreAwarded,
      totalScore: session.score,
      detailedExplanation: question.detailedExplanation,
      feedbackMessage,
      correctAnswerId: question.correctAnswer,
    };

    markAttemptAnswered({
      attemptId,
      selectedOption: selectedOptionId,
      resultJson: JSON.stringify(result),
      scoreAwarded,
      xpAwarded: scoreAwarded,
      lifeLost,
      comboBefore: 0,
      comboAfter: 0,
      multiplier: 1.0,
    });

    if (requestId) {
      saveIdempotentResult({
        requestId,
        uid,
        endpoint: '/api/attempt/submit',
        attemptId,
        responseBody: result,
      });
    }

    logAudit({
      category: isTimeout ? 'TIMEOUT' : 'STATE_CHANGE',
      uid,
      attemptId,
      requestId,
      result: isCorrect ? 'CORRECT' : 'INCORRECT',
      details: `Question ${attempt.questionId} answered. Lives: ${session.lives}, Score awarded: ${scoreAwarded}`,
    });

    return result;
  });
}

// -------------------------------------------------------------
// EMERGENCY MISSION / TIME TRIAL (PERSISTENT & AUTHORITATIVE)
// -------------------------------------------------------------
function generateEmergencyAttemptId(missionId: string, uid: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  return `ematt_${uid.replace(/[^a-zA-Z0-9]/g, '')}_${missionId}_${timePart}_${randomPart}`;
}

export function startEmergencyAttempt(
  missionId: string,
  uid: string = 'astronaut',
  requestId?: string
): { attemptId: string; startedAt: number; deadlineAt: number; timeLimit: number } {
  if (requestId) {
    const cached = getIdempotentResult(requestId);
    if (cached && cached.body) {
      return cached.body as {
        attemptId: string;
        startedAt: number;
        deadlineAt: number;
        timeLimit: number;
      };
    }
  }

  const session = dbGetOrCreateSession(uid);
  if (session.lives <= 0) {
    logAudit({
      category: 'GAME_OVER',
      uid,
      requestId,
      details: 'Attempted to start emergency mission with 0 lives',
    });
    throw new Error('Vidas esgotadas (Game Over). Reinicie a partida para continuar.');
  }

  const mission = EMERGENCY_MISSIONS.find((m) => m.id === missionId);
  if (!mission) {
    throw new Error(`Missão de emergência "${missionId}" não encontrada.`);
  }

  const now = Date.now();
  const timeLimit = mission.timeLimit || 90;
  // 3000ms latency buffer
  const deadlineAt = now + timeLimit * 1000 + 3000;
  const attemptId = generateEmergencyAttemptId(missionId, uid);

  saveNewAttempt({
    attemptId,
    uid,
    type: 'emergency',
    missionId,
    startedAt: now,
    deadline: deadlineAt,
    timeAllowedSeconds: timeLimit,
    requestId,
  });

  const responseData = {
    attemptId,
    startedAt: now,
    deadlineAt,
    timeLimit,
  };

  if (requestId) {
    saveIdempotentResult({
      requestId,
      uid,
      endpoint: '/api/timetrial/start',
      attemptId,
      responseBody: responseData,
    });
  }

  logAudit({
    category: 'STATE_CHANGE',
    uid,
    attemptId,
    requestId,
    details: `Emergency attempt started for ${missionId}`,
  });

  return responseData;
}

export function submitEmergencyAttempt(params: {
  attemptId: string;
  selectedOptionId: string;
  uid?: string;
  comboCount?: number;
  requestId?: string;
  clientTimeLeft?: number;
}): EmergencySubmissionResult {
  const {
    attemptId,
    selectedOptionId,
    uid = 'astronaut',
    comboCount = 0,
    requestId,
  } = params;

  if (requestId) {
    const cached = getIdempotentResult(requestId);
    if (cached && cached.body) {
      return cached.body as EmergencySubmissionResult;
    }
  }

  const persistedAttempt = getAttempt(attemptId);
  if (!persistedAttempt) {
    logAudit({
      category: 'INVALID_ATTEMPT',
      uid,
      attemptId,
      requestId,
      errorCode: 'ATTEMPT_NOT_FOUND',
      details: 'Emergency attempt not found in database',
    });
    throw new Error('Tentativa de emergência inválida ou expirada.');
  }

  if (persistedAttempt.uid && uid && persistedAttempt.uid !== uid) {
    logAudit({
      category: 'FORBIDDEN',
      uid,
      attemptId,
      requestId,
      errorCode: 'FORBIDDEN',
      details: `Cross-user emergency access: owned by ${persistedAttempt.uid}, requested by ${uid}`,
    });
    throw new Error('Tentativa de emergência pertence a outro usuário.');
  }

  if (persistedAttempt.answered && persistedAttempt.result) {
    logAudit({
      category: 'REPLAY',
      uid,
      attemptId,
      requestId,
      details: 'Idempotent replay of previously answered emergency mission attempt',
    });
    return JSON.parse(persistedAttempt.result) as EmergencySubmissionResult;
  }

  return runInTransaction(() => {
    const attempt = getAttempt(attemptId);
    if (!attempt) {
      throw new Error('Tentativa de emergência inválida ou expirada.');
    }
    if (attempt.answered && attempt.result) {
      return JSON.parse(attempt.result) as EmergencySubmissionResult;
    }

    const mission = EMERGENCY_MISSIONS.find((m) => m.id === attempt.missionId);
    if (!mission) {
      throw new Error('Missão de emergência não localizada no servidor.');
    }

    const now = Date.now();
    const session = dbGetOrCreateSession(attempt.uid || uid);

    if (session.lives <= 0) {
      logAudit({
        category: 'GAME_OVER',
        uid,
        attemptId,
        details: 'Attempted to submit emergency attempt with 0 lives',
      });
      throw new Error('Vidas esgotadas (Game Over). Não é possível submeter respostas sem vidas.');
    }

    const isTimeout = now > attempt.deadline || selectedOptionId === 'TIMEOUT';
    const chosenOption = mission.options.find((o) => o.id === selectedOptionId);
    const isCorrect =
      !isTimeout &&
      !!chosenOption &&
      Math.abs(chosenOption.value - mission.objective.expectedValue) <=
        (mission.objective.tolerance || 0.1);

    let scoreResult: ScoreCalculationResult | undefined;
    let errorDiagnosis: EmergencySubmissionResult['errorDiagnosis'];
    let lifeLost = 0;
    let scoreAwarded = 0;

    if (isCorrect) {
      const elapsedSeconds = Math.max(0, Math.floor((now - attempt.startedAt) / 1000));
      const serverRemainingSeconds = Math.max(0, mission.timeLimit - elapsedSeconds);
      const sanitizedCombo = Math.min(5, Math.max(0, Math.floor(Number(comboCount) || 0)));
      const validCombo = sanitizedCombo + 1;

      scoreResult = calculateMissionScore(
        mission.reward.xp,
        serverRemainingSeconds,
        mission.timeLimit,
        validCombo
      );

      scoreAwarded = scoreResult.totalXP;
      session.score += scoreAwarded;
      session.xp += scoreAwarded;
      session.comboCount = sanitizedCombo + 1;
      session.comboMultiplier = Math.min(2.0, 1.0 + (sanitizedCombo + 1) * 0.2);
    } else {
      lifeLost = 1;
      session.lives = Math.max(0, session.lives - 1);
      session.comboCount = 0;
      session.comboMultiplier = 1.0;

      if (chosenOption) {
        errorDiagnosis = diagnoseErrorType(chosenOption.value, mission.objective.expectedValue, {
          voltage: mission.voltage,
          resistors: mission.circuit.resistors,
          config: mission.circuit.configuration,
          targetType:
            mission.objective.type === 'calculate_current'
              ? 'current'
              : mission.objective.type === 'calculate_voltage'
              ? 'voltage'
              : mission.objective.type === 'calculate_resistance'
              ? 'resistance'
              : 'power',
        });
      } else {
        errorDiagnosis = {
          type: 'interpretation',
          explanation: 'Tempo limite esgotado antes da conclusão do diagnóstico.',
        };
      }
    }

    saveSessionWithOcc(session, session.version);

    const result: EmergencySubmissionResult = {
      attemptId,
      isCorrect,
      isTimeout,
      livesRemaining: session.lives,
      totalScore: session.score,
      scoreResult,
      errorDiagnosis,
      expectedValue: mission.objective.expectedValue,
    };

    markAttemptAnswered({
      attemptId,
      selectedOption: selectedOptionId,
      resultJson: JSON.stringify(result),
      scoreAwarded,
      xpAwarded: scoreAwarded,
      lifeLost,
      comboBefore: Number(comboCount) || 0,
      comboAfter: session.comboCount,
      multiplier: session.comboMultiplier,
    });

    if (requestId) {
      saveIdempotentResult({
        requestId,
        uid,
        endpoint: '/api/timetrial/submit',
        attemptId,
        responseBody: result,
      });
    }

    logAudit({
      category: isTimeout ? 'TIMEOUT' : 'STATE_CHANGE',
      uid,
      attemptId,
      requestId,
      result: isCorrect ? 'CORRECT' : 'INCORRECT',
      details: `Emergency mission ${attempt.missionId} finished. Lives: ${session.lives}, Score: ${scoreAwarded}`,
    });

    return result;
  });
}

export function pruneStaleAttempts(): { activeQuestionsPruned: number; activeEmergencyPruned: number } {
  dbPruneStale();
  return { activeQuestionsPruned: 0, activeEmergencyPruned: 0 };
}
