import { Question, QuestionPublic, QuestionAttempt, AttemptSubmissionResult, SectorId, QuestionOption } from '../types';
import { ALL_QUESTIONS } from '../data/questions';

export const MAX_LIVES = 5;

// In-memory authority store for active question attempts (prevents replay and double submission)
const activeAttempts = new Map<string, QuestionAttempt>();
const attemptResults = new Map<string, AttemptSubmissionResult>();

// User sessions tracking (server-side authority)
interface UserSessionState {
  uid: string;
  lives: number;
  score: number;
  completedSectors: Set<SectorId>;
  lastSubmissionTimestamp: number;
}

const userSessions = new Map<string, UserSessionState>();

export function getOrCreateSession(uid: string): UserSessionState {
  if (!userSessions.has(uid)) {
    userSessions.set(uid, {
      uid,
      lives: MAX_LIVES,
      score: 0,
      completedSectors: new Set<SectorId>(),
      lastSubmissionTimestamp: 0,
    });
  }
  return userSessions.get(uid)!;
}

export function resetUserSession(uid: string) {
  const session = getOrCreateSession(uid);
  session.lives = MAX_LIVES;
  session.score = 0;
  session.completedSectors.clear();
  return session;
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

export function startQuestionAttempt(
  questionId: string,
  sectorId: SectorId,
  uid: string
): { attempt: QuestionAttempt; questionPublic: QuestionPublic } {
  const sectorList = ALL_QUESTIONS[sectorId] || [];
  const fullQuestion = sectorList.find((q) => q.id === questionId);

  if (!fullQuestion) {
    throw new Error(`Questão com id "${questionId}" não encontrada no setor ${sectorId}.`);
  }

  const now = Date.now();
  const timeAllowedSeconds = fullQuestion.timeSeconds || 120;
  // 3000ms latency tolerance buffer
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

  activeAttempts.set(attemptId, attempt);

  const questionPublic = sanitizeQuestionForPublic(fullQuestion);

  return { attempt, questionPublic };
}

export function submitQuestionAttempt(params: {
  attemptId: string;
  selectedOptionId: string;
  usedHintLevel?: 0 | 1 | 2 | 3;
  uid?: string;
  clientTimeLeft?: number;
}): AttemptSubmissionResult {
  const { attemptId, selectedOptionId, usedHintLevel = 0, uid = 'anonymous_astronaut' } = params;

  // IDEMPOTENCY CHECK: If already submitted, return the exact same recorded outcome
  if (attemptResults.has(attemptId)) {
    return attemptResults.get(attemptId)!;
  }

  const attempt = activeAttempts.get(attemptId);
  if (!attempt) {
    throw new Error('Tentativa inválida ou expirada. Inicie a questão novamente.');
  }

  if (attempt.answered) {
    if (attemptResults.has(attemptId)) {
      return attemptResults.get(attemptId)!;
    }
  }

  const now = Date.now();
  const session = getOrCreateSession(attempt.uid || uid);

  // Locate the authoritative question
  const sectorList = ALL_QUESTIONS[attempt.sectorId] || [];
  const question = sectorList.find((q) => q.id === attempt.questionId);

  if (!question) {
    throw new Error('Questão autoritativa não localizada no servidor.');
  }

  // Check deadline (timeout)
  const isTimeout = now > attempt.deadlineAt;
  const isCorrect = !isTimeout && selectedOptionId.toUpperCase() === question.correctAnswer.toUpperCase();

  let scoreAwarded = 0;
  let feedbackMessage = '';

  if (isCorrect) {
    // Authoritative score calculation
    const basePoints = question.basePoints || 100;
    const hintPenalty = usedHintLevel === 3 ? 0.5 : usedHintLevel === 2 ? 0.7 : usedHintLevel === 1 ? 0.85 : 1.0;
    
    // Server-measured time bonus
    const elapsedSeconds = Math.max(0, Math.floor((now - attempt.startedAt) / 1000));
    const serverRemainingSeconds = Math.max(0, question.timeSeconds - elapsedSeconds);
    const speedBonus = Math.min(question.timeSeconds * 2, serverRemainingSeconds * 2);

    scoreAwarded = Math.round(basePoints * hintPenalty + speedBonus);
    session.score += scoreAwarded;

    feedbackMessage = `Diagnóstico impecável! A corrente e a tensão foram recalculadas e os instrumentos do ${question.topic} voltaram ao verde!`;
  } else {
    // Deduct exactly 1 life, atomic clamp to 0
    session.lives = Math.max(0, session.lives - 1);
    scoreAwarded = 0;

    if (isTimeout) {
      feedbackMessage = 'O tempo limite esgotou-se antes da estabilização dos circuitos. A estação perdeu 1 vida de reserva.';
    } else {
      feedbackMessage = 'A corrente no circuito apresentou anomalia com essa alternativa. O sistema perdeu 1 vida de reserva.';
    }
  }

  attempt.answered = true;
  attempt.selectedOptionId = selectedOptionId;
  attempt.isCorrect = isCorrect;
  attempt.scoreAwarded = scoreAwarded;
  attempt.completedAt = now;

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

  attemptResults.set(attemptId, result);
  session.lastSubmissionTimestamp = now;

  return result;
}
