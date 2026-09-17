import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Lock,
  Unlock,
  RefreshCw,
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  Database,
  Search,
  Activity,
} from 'lucide-react';

interface TeacherDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ClassSummary {
  totalStudents: number;
  activeStudents: number;
  gameOverStudents: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalErrors: number;
  globalAccuracy: number;
  avgScore: number;
  databaseMode: string;
  integrityCheck: string;
}

interface SectorMetric {
  sectorId: number;
  sectorName: string;
  attemptsCount: number;
  correctCount: number;
  errorCount: number;
  accuracyPercent: number;
  needsIntervention: boolean;
}

interface StudentRecord {
  uid: string;
  status: string;
  lives: number;
  score: number;
  xp: number;
  completedSectors: number[];
  totalAnswered: number;
  correctCount: number;
  errorCount: number;
  accuracy: number;
  lastActivityAt: number;
}

interface TelemetryEvent {
  attemptId: string;
  uid: string;
  questionId: string;
  sectorId: number;
  sectorName: string;
  isCorrect: boolean;
  scoreAwarded: number;
  timestamp: number;
}

export const TeacherDashboardModal: React.FC<TeacherDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [pin, setPin] = useState<string>('');
  const [token, setToken] = useState<string>(() => sessionStorage.getItem('TEACHER_AUTH_TOKEN') || '');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(sessionStorage.getItem('TEACHER_AUTH_TOKEN')));
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Data state
  const [summary, setSummary] = useState<ClassSummary | null>(null);
  const [sectorMetrics, setSectorMetrics] = useState<SectorMetric[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [recentEvents, setRecentEvents] = useState<TelemetryEvent[]>([]);
  const [filterSearch, setFilterSearch] = useState<string>('');

  const fetchOverview = async (authToken: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/teacher/overview', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('TEACHER_AUTH_TOKEN');
        setAuthError('Sessão de docente expirada. Insira o código novamente.');
        return;
      }

      if (!res.ok) {
        throw new Error('Falha ao carregar dados do servidor.');
      }

      const data = await res.json();
      setSummary(data.classSummary);
      setSectorMetrics(data.sectorMetrics || []);
      setStudents(data.students || []);
      setRecentEvents(data.recentEvents || []);
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao comunicar com a telemetria.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchOverview(token);
    }
  }, [isOpen, token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/teacher/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.ok && data.token) {
        setToken(data.token);
        setIsAuthenticated(true);
        sessionStorage.setItem('TEACHER_AUTH_TOKEN', data.token);
        await fetchOverview(data.token);
      } else {
        setAuthError(data.error || 'Código incorreto. Tente: prof-ares-2026');
      }
    } catch {
      setAuthError('Falha ao conectar com o serviço de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('TEACHER_AUTH_TOKEN');
    setToken('');
    setIsAuthenticated(false);
    setSummary(null);
    setStudents([]);
    setSectorMetrics([]);
  };

  if (!isOpen) return null;

  const filteredStudents = students.filter((s) =>
    s.uid.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-mono font-bold text-white tracking-wide flex items-center gap-2">
                PAINEL PEDAGÓGICO DO PROFESSOR
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                  Ares-3 Telemetria Real
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditoria autoritativa de progresso escolar, diagnósticos de circuitos e análise de erros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => fetchOverview(token)}
                disabled={isLoading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
                title="Atualizar Dados"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isAuthenticated ? (
            // Authentication Gate
            <div className="max-w-md mx-auto py-12 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-mono">Acesso do Corpo Docente</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para visualizar a telemetria em tempo real das tentativas dos estudantes, insira o código de autorização pedagógica da instituição.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Código de acesso (ex: prof-ares-2026)"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white font-mono text-center text-sm transition-all"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-lg">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isLoading ? 'AUTENTICANDO...' : 'ACESSAR TELEMETRIA'}</span>
                </button>
              </form>

              <p className="text-[11px] text-slate-500 font-mono">
                Dica do sistema escolar: Código padrão de homologação <code className="text-cyan-400">prof-ares-2026</code>
              </p>
            </div>
          ) : (
            // Authenticated Dashboard Content
            <div className="space-y-6">
              {/* Top KPI Cards */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-xs font-mono">Alunos Registrados</span>
                      <Users className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {summary.totalStudents}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {summary.activeStudents} ativos | {summary.gameOverStudents} game over
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-xs font-mono">Questões Respondidas</span>
                      <Activity className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {summary.totalQuestionsAnswered}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                      {summary.totalCorrect} acertos | {summary.totalErrors} erros
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-xs font-mono">Aproveitamento Global</span>
                      <Award className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-300">
                      {summary.globalAccuracy}%
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Média: {summary.avgScore} pts
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-xs font-mono">Integridade Banco</span>
                      <Database className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-300">
                      {summary.integrityCheck.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {summary.databaseMode}
                    </div>
                  </div>
                </div>
              )}

              {/* Sector Difficulty & Intervention Map */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Desempenho por Domínio Conceitual (Setores 1 a 9)
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">Critério: &lt;60% acertos requer intervenção</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {sectorMetrics.map((sec) => (
                    <div
                      key={sec.sectorId}
                      className={`p-3.5 rounded-xl border ${
                        sec.needsIntervention
                          ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="font-bold text-white truncate max-w-[170px]" title={sec.sectorName}>
                          S{sec.sectorId}: {sec.sectorName}
                        </span>
                        <span className={`font-bold ${sec.accuracyPercent >= 70 ? 'text-emerald-400' : sec.accuracyPercent >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {sec.accuracyPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all ${
                            sec.accuracyPercent >= 70 ? 'bg-emerald-500' : sec.accuracyPercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(5, sec.accuracyPercent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>{sec.attemptsCount} questões respondidas</span>
                        {sec.needsIntervention && (
                          <span className="text-[10px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950 border border-rose-800">
                            REFORÇAR
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Progress Table */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Registros Autoritativos dos Alunos ({filteredStudents.length})
                  </h4>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      placeholder="Filtrar por nome do aluno..."
                      className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400 w-52 sm:w-64"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Astronauta (UID)</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-center">Vidas</th>
                        <th className="p-2.5 text-right">Pontos</th>
                        <th className="p-2.5 text-center">Setores Concluídos</th>
                        <th className="p-2.5 text-center">Resp. / Acertos</th>
                        <th className="p-2.5 text-center">Precisão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-500">
                            Nenhum aluno encontrado no banco autoritativo.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => (
                          <tr key={s.uid} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-2.5 font-bold text-white">{s.uid}</td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.status === 'ACTIVE'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="font-bold text-rose-400">♥ {s.lives}/5</span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-300">
                              {s.score.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-center text-slate-300">
                              {s.completedSectors.length > 0 ? (
                                <span className="text-cyan-400 font-bold">
                                  {s.completedSectors.length} / 9
                                </span>
                              ) : (
                                <span className="text-slate-500">Nenhum</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center text-slate-300">
                              {s.totalAnswered} / {s.correctCount}
                            </td>
                            <td className="p-2.5 text-center font-bold">
                              <span className={s.accuracy >= 70 ? 'text-emerald-400' : s.accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                                {s.accuracy}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Live Feed */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Fluxo Recente de Respostas (Auditoria ACID)
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {recentEvents.length === 0 ? (
                    <p className="text-xs text-slate-500 font-mono">Nenhum evento registrado ainda.</p>
                  ) : (
                    recentEvents.map((evt) => (
                      <div
                        key={evt.attemptId}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          {evt.isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span className="font-bold text-white">{evt.uid}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{evt.sectorName}</span>
                          <span className="text-slate-600 text-[10px]">({evt.questionId})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={evt.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {evt.isCorrect ? `+${evt.scoreAwarded} pts` : '-1 vida'}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-500 font-mono">
                  Sessão ativa sob código docente. Dados armazenados em SQLite WAL com integridade transacional.
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold cursor-pointer"
                >
                  Encerrar Sessão Docente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
