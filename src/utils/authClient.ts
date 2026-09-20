import { User } from '../types';

const SESSION_TOKEN_KEY = 'ARES3_SESSION_TOKEN';

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
      const res = await fetch('/api/auth/me', {
        headers: this.getHeaders(),
      });

      if (res.status === 401) {
        this.removeToken();
        return null;
      }

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.user as User;
    } catch {
      return null;
    }
  }

  public static async register(params: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: User; sessionToken: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao criar conta.');
    }

    if (data.sessionToken) {
      this.setToken(data.sessionToken);
    }

    return data;
  }

  public static async login(params: {
    email: string;
    password: string;
  }): Promise<{ user: User; sessionToken: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível entrar. Verifique seu e-mail e sua senha.');
    }

    if (data.sessionToken) {
      this.setToken(data.sessionToken);
    }

    return data;
  }

  public static async loginWithGoogle(credential: string): Promise<{ user: User; sessionToken: string }> {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao autenticar com o Google.');
    }

    if (data.sessionToken) {
      this.setToken(data.sessionToken);
    }

    return data;
  }

  public static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
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
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    return await res.json();
  }

  public static async resetPassword(params: {
    token: string;
    newPassword: string;
  }): Promise<{ ok: boolean; message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao redefinir senha.');
    }

    return data;
  }

  public static async updateProfile(params: {
    name?: string;
    school?: string;
    grade?: string;
    className?: string;
    photoUrl?: string;
    onboardingCompleted?: boolean;
  }): Promise<User> {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao atualizar perfil.');
    }

    return data.user as User;
  }

  // -------------------------------------------------------------
  // CLASSES & PEDAGOGICAL MONITORING (Phase 2)
  // -------------------------------------------------------------
  public static async joinClass(code: string): Promise<{ classItem: any; message: string }> {
    const res = await fetch('/api/classes/join', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível entrar na turma. Verifique o código.');
    }

    return data;
  }

  public static async getStudentClasses(): Promise<any[]> {
    try {
      const res = await fetch('/api/student/classes', {
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];
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

    const res = await fetch(`/api/teacher/dashboard?${params.toString()}`, {
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao carregar dashboard pedagógico.');
    }

    return data;
  }

  public static async getTeacherClasses(teacherToken?: string): Promise<any[]> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    const res = await fetch('/api/teacher/classes', {
      headers,
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.classes || [];
  }

  public static async createTeacherClass(name: string, code?: string, teacherToken?: string): Promise<any> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    const res = await fetch('/api/teacher/classes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: name.trim(), code: code ? code.trim() : undefined }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao criar turma.');
    }

    return data.class;
  }

  public static async getStudentPerformance(studentId: string, teacherToken?: string): Promise<any> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    const res = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/performance`, {
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao obter desempenho do aluno.');
    }

    return data;
  }

  public static async getQuestionsAnalytics(teacherToken?: string): Promise<any> {
    const headers = this.getHeaders();
    if (teacherToken) {
      headers['Authorization'] = `Bearer ${teacherToken}`;
      headers['x-teacher-key'] = teacherToken;
    }

    const res = await fetch('/api/teacher/questions-analytics', {
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao obter análise de questões.');
    }

    return data;
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

    const res = await fetch(`/api/teacher/attempts?${params.toString()}`, {
      headers,
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.attempts || [];
  }
}
