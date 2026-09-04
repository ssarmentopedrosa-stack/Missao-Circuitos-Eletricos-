import {
  QuestionPublic,
  QuestionAttempt,
  AttemptSubmissionResult,
  EmergencySubmissionResult,
  SectorId,
} from '../types';

export type { EmergencySubmissionResult };

function generateRequestId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `req_${prefix}_${Date.now()}_${rand}`;
}

class AuthoritativeGameClient {
  public async startQuestion(
    questionId: string,
    sectorId: SectorId,
    uid: string
  ): Promise<{ attempt: QuestionAttempt; questionPublic: QuestionPublic }> {
    const requestId = generateRequestId('start_q');
    const res = await fetch('/api/attempt/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify({ questionId, sectorId, uid, requestId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao iniciar questão' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  public async submitAnswer(params: {
    attemptId: string;
    selectedOptionId: string;
    usedHintLevel?: 0 | 1 | 2 | 3;
    uid?: string;
    clientTimeLeft?: number;
  }): Promise<AttemptSubmissionResult> {
    const requestId = generateRequestId('sub_q');
    const res = await fetch('/api/attempt/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify({ ...params, requestId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao submeter resposta' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  public async getSession(uid: string): Promise<{ uid: string; lives: number; score: number }> {
    const res = await fetch(`/api/user/session/${encodeURIComponent(uid)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao obter sessão' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async resetSession(uid: string): Promise<{ lives: number; score: number }> {
    const res = await fetch('/api/user/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao reiniciar sessão' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  public async startEmergencyMission(
    missionId: string,
    uid: string
  ): Promise<{ attemptId: string; startedAt: number; deadlineAt: number; timeLimit: number }> {
    const requestId = generateRequestId('start_em');
    const res = await fetch('/api/timetrial/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify({ missionId, uid, requestId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao iniciar missão de emergência' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  public async submitEmergencyMission(params: {
    attemptId: string;
    selectedOptionId: string;
    uid?: string;
    comboCount?: number;
    clientTimeLeft?: number;
  }): Promise<EmergencySubmissionResult> {
    const requestId = generateRequestId('sub_em');
    const res = await fetch('/api/timetrial/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify({ ...params, requestId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao submeter missão de emergência' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }
}

export const gameClient = new AuthoritativeGameClient();
