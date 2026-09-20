import { User } from '../types';
import { getApiUrl } from './apiConfig';

const SESSION_TOKEN_KEY = 'ARES3_SESSION_TOKEN';

/**
 * Utilitário seguro para requisições e processamento de respostas HTTP da API.
 * Garante que respostas text/html (erros de proxy, 404, 502, gateways) NUNCA sejam
 * interpretadas por response.json(), prevenindo erros como "Unexpected token 'T'".
 */
export async function parseSafeJsonResponse<T = any>(
  res: Response,
  fallbackError: string = 'Falha na comunicação com o servidor da estação.'
): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    let bodySnippet = '';
    try {
      bodySnippet = (await res.text()).trim().slice(0, 200);
    } catch {
      // ignore
    }
    console.warn(`[AuthClient] Resposta não-JSON recebida (Status ${res.status} para ${res.url}):`, bodySnippet);

    // Identificação de interceptação de segurança/cookies do proxy de hospedagem
    if (bodySnippet.includes('__cookie_check') || bodySnippet.includes('aistudio_auth_flow') || bodySnippet.includes('Action required to load your app')) {
      throw new Error('Bloqueio de cookies de segurança pelo navegador/hosting. Se estiver em aba anônima, permita os cookies ou abra a aplicação em uma nova aba.');
    }

    if (res.status === 401) {
      throw new Error('Sessão expirada ou credenciais inválidas.');
    }
    if (res.status === 403) {
      throw new Error('Acesso não autorizado ao recurso.');
    }
    if (res.status === 404) {
      throw new Error(`Rota ou recurso não encontrado no servidor (404 Not Found): ${res.url || 'API'}`);
    }
    if (res.status === 429) {
      throw new Error('Muitas requisições (Rate Limit). Aguarde alguns instantes.');
    }
    if (res.status >= 500) {
      throw new Error(`Falha no servidor da estação orbital (${res.status}). Tente novamente em instantes.`);
    }

    throw new Error(fallbackError);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    console.error('[AuthClient] Falha ao processar JSON da resposta:', err);
    throw new Error(fallbackError);
  }

  if (!res.ok) {
    const message = data?.error || data?.message || fallbackError;
    const error = new Error(message);
    (error as any).errorCode = data?.errorCode;
    throw error;
  }

  return data as T;
}

export class AuthClient {
  public static getToken(): string | null {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public static setToken(token: string): void {
    try {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } catch {
      // ignore
    }
  }

  public static removeToken(): void {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {
      // ignore
    }
  }

  private static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public static async getMe(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        headers: this.getHeaders(),
      });

      if (res.status === 401) {
        this.removeToken();
        return null;
      }

      if (!res.ok) {
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        return null;
      }

      const data = await res.json();
      return (data?.user as User) || null;
    } catch {
      return null;
    }
  }

  public static async register(params: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: User; sessionToken: string }> {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch {
      throw new Error('Falha de conexão com a estação orbital. Verifique sua rede.');
    }

    const data = await parseSafeJsonResponse<{ user: User; sessionToken: string }>(
      res,
      'Não foi possível criar a conta. Tente novamente.'
    );

    if (data.sessionToken) {
      this.setToken(data.sessionToken);
    }

    return data;
  }

  public static async login(params: {
    email: string;
    password: string;
  }): Promise<{ user: User; sessionToken: string }> {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch {
      throw new Error('Falha de conexão com a estação orbital. Verifique sua rede.');
    }

    const data = await parseSafeJsonResponse<{ user: User; sessionToken: string }>(
      res,
      'Não foi possível entrar. Verifique seu e-mail e sua senha.'
    );

    if (data.sessionToken) {
      this.setToken(data.sessionToken);
    }

    return data;
  }

  public static async loginWithGoogle(credential: string): Promise<{ user: User; sessionToken: string }> {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
    } catch {
      throw new Error('Falha de conexão ao autenticar com o Google. Verifique sua rede.');
    }

    const data = await parseSafeJsonResponse<{ user: User; sessionToken: string }>(
      res,
      'Falha ao autenticar com o Google.'
    );

    if (data.sessionToken) {
      this.setToken(data.sessionToken);
    }

    return data;
  }

  public static async logout(): Promise<void> {
    try {
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch {
      // ignore
    } finally {
      this.removeToken();
    }
  }

  public static async forgotPassword(email: string): Promise<{ ok: boolean; message: string; resetToken?: string }> {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      throw new Error('Falha de conexão ao solicitar recuperação de senha.');
    }

    return await parseSafeJsonResponse<{ ok: boolean; message: string; resetToken?: string }>(
      res,
      'Falha ao solicitar recuperação de senha.'
    );
  }

  public static async resetPassword(params: {
    token: string;
    newPassword: string;
  }): Promise<{ ok: boolean; message: string }> {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch {
      throw new Error('Falha de conexão ao redefinir senha.');
    }

    return await parseSafeJsonResponse<{ ok: boolean; message: string }>(
      res,
      'Erro ao redefinir senha.'
    );
  }

  public static async updateProfile(params: {
    name?: string;
    school?: string;
    grade?: string;
    className?: string;
    photoUrl?: string;
    onboardingCompleted?: boolean;
  }): Promise<User> {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
    } catch {
      throw new Error('Falha de conexão ao atualizar perfil.');
    }

    const data = await parseSafeJsonResponse<{ user: User }>(
      res,
      'Erro ao atualizar perfil.'
    );

    return data.user;
  }

  // -------------------------------------------------------------
  // CLASSES & PEDAGOGICAL MONITORING (Phase 2)
  // -------------------------------------------------------------
  public static async joinClass(code: string): Promise<{ classItem: any; message: string }> {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/classes/join'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ code: code.trim() }),
      });
    } catch {
      throw new Error('Falha de conexão ao ingressar na turma.');
    }

    return await parseSafeJsonResponse<{ classItem: any; message: string }>(
      res,
      'Não foi possível entrar na turma. Verifique o código.'
    );
  }

  public static async getStudentClasses(): Promise<any[]> {
    try {
      const res = await fetch(getApiUrl('/api/student/classes'), {
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) return [];
      const data = await res.json();
      return data.classes || [];
    } catch {
      return [];
    }
  }

  public static async getTeacherDashboard(filters: {
    classId?: string;
    missionId?: string;
    period?: 'all' | '7d' | '30d' | '180d';
  } = {}, teacherToken?: string): Promise<any> {
    const params = new URLSearchParams();
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.missionId) params.append('missionId', filters.missionId);
    if (filters.period) params.append('period', filters.period);

    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    let res: Response;
    try {
      res = await fetch(getApiUrl(`/api/teacher/dashboard?${params.toString()}`), {
        headers,
      });
    } catch {
      throw new Error('Falha de conexão ao carregar dashboard pedagógico.');
    }

    return await parseSafeJsonResponse<any>(
      res,
      'Falha ao carregar dashboard pedagógico.'
    );
  }

  public static async getTeacherClasses(teacherToken?: string): Promise<any[]> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    try {
      const res = await fetch(getApiUrl('/api/teacher/classes'), {
        headers,
      });

      if (!res.ok) return [];
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) return [];
      const data = await res.json();
      return data.classes || [];
    } catch {
      return [];
    }
  }

  public static async createTeacherClass(name: string, code?: string, teacherToken?: string): Promise<any> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/teacher/classes'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: name.trim(), code: code ? code.trim() : undefined }),
      });
    } catch {
      throw new Error('Falha de conexão ao criar turma.');
    }

    const data = await parseSafeJsonResponse<{ class: any }>(
      res,
      'Erro ao criar turma.'
    );

    return data.class;
  }

  public static async getStudentPerformance(studentId: string, teacherToken?: string): Promise<any> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    let res: Response;
    try {
      res = await fetch(getApiUrl(`/api/teacher/students/${encodeURIComponent(studentId)}/performance`), {
        headers,
      });
    } catch {
      throw new Error('Falha de conexão ao obter desempenho do aluno.');
    }

    return await parseSafeJsonResponse<any>(
      res,
      'Falha ao obter desempenho do aluno.'
    );
  }

  public static async getQuestionsAnalytics(teacherToken?: string): Promise<any> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/teacher/questions-analytics'), {
        headers,
      });
    } catch {
      throw new Error('Falha de conexão ao obter análise de questões.');
    }

    return await parseSafeJsonResponse<any>(
      res,
      'Falha ao obter análise de questões.'
    );
  }

  public static async getTeacherAttempts(classId?: string, limit: number = 50, teacherToken?: string): Promise<any[]> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    const params = new URLSearchParams();
    if (classId && classId !== 'all') params.append('classId', classId);
    params.append('limit', String(limit));

    try {
      const res = await fetch(getApiUrl(`/api/teacher/attempts?${params.toString()}`), {
        headers,
      });

      if (!res.ok) return [];
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) return [];
      const data = await res.json();
      return data.attempts || [];
    } catch {
      return [];
    }
  }
}
