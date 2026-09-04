import { QuestionPublic, QuestionAttempt, AttemptSubmissionResult, SectorId } from '../types';
import {
  startQuestionAttempt as localStartAttempt,
  submitQuestionAttempt as localSubmitAttempt,
  getOrCreateSession,
  resetUserSession,
} from './authoritativeEngine';

class AuthoritativeGameClient {
  public async startQuestion(
    questionId: string,
    sectorId: SectorId,
    uid: string
  ): Promise<{ attempt: QuestionAttempt; questionPublic: QuestionPublic }> {
    try {
      const res = await fetch('/api/attempt/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, sectorId, uid }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback: use local authoritative engine
    }
    return localStartAttempt(questionId, sectorId, uid);
  }

  public async submitAnswer(params: {
    attemptId: string;
    selectedOptionId: string;
    usedHintLevel?: 0 | 1 | 2 | 3;
    uid?: string;
    clientTimeLeft?: number;
  }): Promise<AttemptSubmissionResult> {
    try {
      const res = await fetch('/api/attempt/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback: use local authoritative engine
    }
    return localSubmitAttempt(params);
  }

  public async getSession(uid: string): Promise<{ uid: string; lives: number; score: number }> {
    try {
      const res = await fetch(`/api/user/session/${encodeURIComponent(uid)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Local fallback
    }
    const local = getOrCreateSession(uid);
    return { uid: local.uid, lives: local.lives, score: local.score };
  }

  public async resetSession(uid: string): Promise<{ lives: number; score: number }> {
    try {
      const res = await fetch('/api/user/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Local fallback
    }
    const local = resetUserSession(uid);
    return { lives: local.lives, score: local.score };
  }
}

export const gameClient = new AuthoritativeGameClient();
