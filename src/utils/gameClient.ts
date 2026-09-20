import {
  QuestionPublic,
  QuestionAttempt,
  AttemptSubmissionResult,
  EmergencySubmissionResult,
  SectorId,
} from '../types';
import { AuthClient, parseSafeJsonResponse } from './authClient';
import { getApiUrl } from './apiConfig';

export type { EmergencySubmissionResult };

function generateRequestId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `req_${prefix}_${Date.now()}_${rand}`;
}

class AuthoritativeGameClient {
  private getHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (extraHeaders) {
      Object.assign(headers, extraHeaders);
    }
    const token = AuthClient.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public async startQuestion(
    questionId: string,
    sectorId: SectorId,
    uid: string
  ): Promise<{ attempt: QuestionAttempt; questionPublic: QuestionPublic }> {
    const requestId = generateRequestId('start_q');
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/attempt/start'), {
        method: 'POST',
        headers: this.getHeaders({ 'x-request-id': requestId }),
        body: JSON.stringify({ questionId, sectorId, uid, requestId }),
      });
    } catch {
      throw new Error('Falha de conexão ao iniciar questão na estação.');
    }

    return await parseSafeJsonResponse<{ attempt: QuestionAttempt; questionPublic: QuestionPublic }>(
      res,
      'Falha ao iniciar questão.'
    );
  }

  public async submitAnswer(params: {
    attemptId: string;
    selectedOptionId: string;
    usedHintLevel?: 0 | 1 | 2 | 3;
    uid?: string;
    clientTimeLeft?: number;
  }): Promise<AttemptSubmissionResult> {
    const requestId = generateRequestId('sub_q');
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/attempt/submit'), {
        method: 'POST',
        headers: this.getHeaders({ 'x-request-id': requestId }),
        body: JSON.stringify({ ...params, requestId }),
      });
    } catch {
      throw new Error('Falha de conexão ao enviar resposta para a estação.');
    }

    return await parseSafeJsonResponse<AttemptSubmissionResult>(
      res,
      'Falha ao submeter resposta.'
    );
  }

  public async getSession(uid: string): Promise<{ uid: string; lives: number; score: number }> {
    let res: Response;
    try {
      res = await fetch(getApiUrl(`/api/user/session/${encodeURIComponent(uid)}`), {
        headers: this.getHeaders(),
      });
    } catch {
      throw new Error('Falha de conexão ao obter sessão da estação.');
    }

    return await parseSafeJsonResponse<{ uid: string; lives: number; score: number }>(
      res,
      'Falha ao obter sessão do usuário.'
    );
  }

  public async resetSession(uid: string): Promise<{ lives: number; score: number }> {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/user/reset'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ uid }),
      });
    } catch {
      throw new Error('Falha de conexão ao reiniciar sessão da estação.');
    }

    return await parseSafeJsonResponse<{ lives: number; score: number }>(
      res,
      'Falha ao reiniciar sessão.'
    );
  }

  public async startEmergencyMission(
    missionId: string,
    uid: string
  ): Promise<{ attemptId: string; startedAt: number; deadlineAt: number; timeLimit: number }> {
    const requestId = generateRequestId('start_em');
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/timetrial/start'), {
        method: 'POST',
        headers: this.getHeaders({ 'x-request-id': requestId }),
        body: JSON.stringify({ missionId, uid, requestId }),
      });
    } catch {
      throw new Error('Falha de conexão ao iniciar missão de emergência.');
    }

    return await parseSafeJsonResponse<{ attemptId: string; startedAt: number; deadlineAt: number; timeLimit: number }>(
      res,
      'Falha ao iniciar missão de emergência.'
    );
  }

  public async submitEmergencyMission(params: {
    attemptId: string;
    selectedOptionId: string;
    uid?: string;
    comboCount?: number;
    clientTimeLeft?: number;
  }): Promise<EmergencySubmissionResult> {
    const requestId = generateRequestId('sub_em');
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/timetrial/submit'), {
        method: 'POST',
        headers: this.getHeaders({ 'x-request-id': requestId }),
        body: JSON.stringify({ ...params, requestId }),
      });
    } catch {
      throw new Error('Falha de conexão ao submeter missão de emergência.');
    }

    return await parseSafeJsonResponse<EmergencySubmissionResult>(
      res,
      'Falha ao submeter missão de emergência.'
    );
  }
}

export const gameClient = new AuthoritativeGameClient();
