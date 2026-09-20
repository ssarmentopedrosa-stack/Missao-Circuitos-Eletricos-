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
  Clock,
  TrendingUp,
  BarChart3,
  PlusCircle,
  Copy,
  Check,
  BookOpen,
  FileText,
  Filter,
  ChevronRight,
  UserCheck,
  UserX,
  Target,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { AuthClient } from '../utils/authClient';
import { getApiUrl } from '../utils/apiConfig';
import { ClassItem, TeacherDashboardKpis } from '../types';

interface TeacherDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SectorMetric {
  sectorId: number;
  sectorName: string;
  attemptsCount: number;
  correctCount: number;
  errorCount: number;
  accuracyPercent: number;
  avgTimeSeconds: number;
  needsIntervention: boolean;
}

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  className: string;
  school?: string;
  grade?: string;
  score: number;
  lives: number;
  totalAnswered: number;
  correctCount: number;
  errorCount: number;
  accuracy: number;
  averageResponseTimeSeconds: number;
  completedSectors: number[];
  status: string;
  hasParticipated: boolean;
  lastActivityAt: number;
}

interface TelemetryEvent {
  attemptId: string;
  studentId: string;
  studentName: string;
  questionId: string;
  sectorId: number;
  sectorName: string;
  isCorrect: boolean;
  scoreAwarded: number;
  timeSpentSeconds: number;
  timestamp: number;
}

interface QuestionAnalyticsItem {
  questionId: string;
  sectorId: number;
  sectorName: string;
  totalAttempts: number;
  errorCount: number;
  correctCount: number;
  errorRatePercentage: number;
  correctRatePercentage: number;
  averageTimeSeconds: number;
  needsReview: boolean;
}

interface AttemptLogItem {
  attemptId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  missionId: string;
  questionId?: string;
  type: string;
  startedAt: number;
  finishedAt?: number;
  score: number;
  isCorrect: boolean;
  elapsedSeconds: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'TIMEOUT' | 'ABANDONED';
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

  // Active Tab: 'overview' | 'students' | 'classes' | 'questions' | 'attempts'
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'classes' | 'questions' | 'attempts'>('overview');

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedMissionId, setSelectedMissionId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '7d' | '30d' | '180d'>('all');

  // Data state
  const [kpis, setKpis] = useState<TeacherDashboardKpis>({
    totalEnrolled: 0,
    totalParticipated: 0,
    totalPending: 0,
    averageScore: 0,
    accuracyPercentage: 0,
    averageResponseTimeSeconds: 0,
    highestScore: 0,
    lowestScore: 0,
  });
  const [sectorMetrics, setSectorMetrics] = useState<SectorMetric[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [recentEvents, setRecentEvents] = useState<TelemetryEvent[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<ClassItem[]>([]);
  const [questionsAnalytics, setQuestionsAnalytics] = useState<QuestionAnalyticsItem[]>([]);
  const [attemptsLog, setAttemptsLog] = useState<AttemptLogItem[]>([]);

  // Search filter inside students table
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Selected Student for detailed performance modal
  const [inspectStudent, setInspectStudent] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);

  // New class creation form
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassCode, setNewClassCode] = useState<string>('');
  const [classCreateMsg, setClassCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreatingClass, setIsCreatingClass] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load Dashboard Data with Filters
  const loadDashboard = async (authToken: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const [dashData, classesData] = await Promise.all([
        AuthClient.getTeacherDashboard({
          classId: selectedClassId,
          missionId: selectedMissionId,
          period: selectedPeriod,
        }, authToken),
        AuthClient.getTeacherClasses(authToken),
      ]);

      if (dashData.kpis) setKpis(dashData.kpis);
      if (dashData.sectorMetrics) setSectorMetrics(dashData.sectorMetrics);
      if (dashData.students) setStudents(dashData.students);
      if (dashData.recentEvents) setRecentEvents(dashData.recentEvents);
      if (classesData) setTeacherClasses(classesData);
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('TEACHER_AUTH_TOKEN');
        setAuthError('Sessão expirada. Autentique-se novamente.');
      } else {
        setAuthError(err.message || 'Falha ao carregar dados pedagógicos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load secondary tab data when tab changes
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    if (activeTab === 'questions') {
      AuthClient.getQuestionsAnalytics(token).then((data) => {
        if (data?.allQuestions) setQuestionsAnalytics(data.allQuestions);
      }).catch(() => {});
    } else if (activeTab === 'attempts') {
      AuthClient.getTeacherAttempts(selectedClassId, 50, token).then((data) => {
        if (Array.isArray(data)) setAttemptsLog(data);
      }).catch(() => {});
    }
  }, [activeTab, isAuthenticated, token, selectedClassId]);

  useEffect(() => {
    if (isOpen && token) {
      loadDashboard(token);
    }
  }, [isOpen, token, selectedClassId, selectedMissionId, selectedPeriod]);

  // Auth Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/teacher/verify-pin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        setAuthError(`Resposta inesperada do servidor (${res.status} ${res.statusText}).`);
        return;
      }

      const data = await res.json();
      if (res.ok && data.ok && data.token) {
        setToken(data.token);
        setIsAuthenticated(true);
        sessionStorage.setItem('TEACHER_AUTH_TOKEN', data.token);
        await loadDashboard(data.token);
      } else {
        setAuthError(data.error || 'Código incorreto. Tente: prof-ares-2026');
      }
    } catch {
      setAuthError('Falha de conexão com o servidor da estação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('TEACHER_AUTH_TOKEN');
    setToken('');
    setIsAuthenticated(false);
    setInspectStudent(null);
  };

  // Create new class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setIsCreatingClass(true);
    setClassCreateMsg(null);
    try {
      const created = await AuthClient.createTeacherClass(newClassName, newClassCode || undefined, token);
      setTeacherClasses((prev) => [created, ...prev]);
      setNewClassName('');
      setNewClassCode('');
      setClassCreateMsg({
        type: 'success',
        text: `Turma "${created.name}" criada com código: ${created.code}. Compartilhe com os alunos!`,
      });
    } catch (err: any) {
      setClassCreateMsg({
        type: 'error',
        text: err.message || 'Erro ao criar turma.',
      });
    } finally {
      setIsCreatingClass(false);
    }
  };

  // Inspect student details
  const handleInspectStudent = async (studentId: string) => {
    setInspectLoading(true);
    try {
      const details = await AuthClient.getStudentPerformance(studentId, token);
      setInspectStudent(details);
    } catch (err: any) {
      alert(err.message || 'Não foi possível carregar os dados detalhados do aluno.');
    } finally {
      setInspectLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (!isOpen) return null;

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.className.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl bg-slate-900/98 border border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.2)] text-slate-100 overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-mono font-bold text-white tracking-wide">
                  PAINEL DOCENTE & TELEMETRIA PEDAGÓGICA
                </h2>
                <span className="hidden sm:inline-flex text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                  Ares-3 • FASE 2
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acompanhamento autoritativo de rendimento, turmas escolares e diagnósticos de circuitos elétricos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => loadDashboard(token)}
                  disabled={isLoading}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
                  title="Recarregar dados"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                  title="Encerrar Acesso Docente"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </>
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

        {/* Auth Gate or Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!isAuthenticated ? (
            // ==========================================
            // AUTHENTICATION VIEW
            // ==========================================
            <div className="max-w-md mx-auto py-12 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-mono">Acesso do Corpo Docente</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para visualizar a telemetria em tempo real das turmas e a análise de rendimento escolar, insira a chave docente da estação.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Código docente (ex: prof-ares-2026)"
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
                  <span>{isLoading ? 'VERIFICANDO...' : 'LIBERAR PAINEL DOCENTE'}</span>
                </button>
              </form>

              <p className="text-[11px] text-slate-500 font-mono">
                Credencial padrão autoritativa da estação: <code className="text-cyan-400">prof-ares-2026</code>
              </p>
            </div>
          ) : (
            // ==========================================
            // AUTHENTICATED DASHBOARD VIEW
            // ==========================================
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'overview'
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Visão Geral & Indicadores</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('students')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'students'
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Alunos ({students.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('classes')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'classes'
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Gestão de Turmas ({teacherClasses.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('questions')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'questions'
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Questões Críticas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('attempts')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'attempts'
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Log de Tentativas</span>
                  </button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
                  <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
                  
                  {/* Class Filter */}
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-slate-900 text-xs text-white font-mono px-2 py-1 rounded-lg border border-slate-700 outline-none focus:border-cyan-400"
                  >
                    <option value="all">Todas as Turmas</option>
                    {teacherClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                    <option value="none">Sem Turma Vinculada</option>
                  </select>

                  {/* Mission / Sector Filter */}
                  <select
                    value={selectedMissionId}
                    onChange={(e) => setSelectedMissionId(e.target.value)}
                    className="bg-slate-900 text-xs text-white font-mono px-2 py-1 rounded-lg border border-slate-700 outline-none focus:border-cyan-400"
                  >
                    <option value="all">Todos os Setores (1-9)</option>
                    <option value="1">Setor 1: 1ª Lei de Ohm</option>
                    <option value="2">Setor 2: 2ª Lei de Ohm</option>
                    <option value="3">Setor 3: Associação Série</option>
                    <option value="4">Setor 4: Associação Paralelo</option>
                    <option value="5">Setor 5: Circuitos Mistos</option>
                    <option value="6">Setor 6: Potência & Joule</option>
                    <option value="7">Setor 7: Geradores & FEM</option>
                    <option value="8">Setor 8: Receptores</option>
                    <option value="9">Setor 9: Leis de Kirchhoff</option>
                  </select>

                  {/* Period Filter */}
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as any)}
                    className="bg-slate-900 text-xs text-white font-mono px-2 py-1 rounded-lg border border-slate-700 outline-none focus:border-cyan-400"
                  >
                    <option value="all">Todo o Período</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="180d">Últimos 180 dias</option>
                  </select>
                </div>
              </div>

              {/* ==========================================
                  TAB 1: OVERVIEW & 8 OFFICIAL KPIS
                  ========================================== */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* 8 Official Teacher KPIs Grid */}
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Indicadores Oficiais de Aprendizagem (8 KPIs)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      
                      {/* KPI 1: Alunos Matriculados */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-xs font-mono">Alunos Matriculados</span>
                          <Users className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-white">
                          {kpis.totalEnrolled}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Base total de estudantes
                        </div>
                      </div>

                      {/* KPI 2: Alunos que Realizaram */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-xs font-mono">Alunos Realizaram</span>
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-emerald-400">
                          {kpis.totalParticipated}
                        </div>
                        <div className="text-[11px] text-emerald-500/80 font-mono mt-0.5">
                          Engajamento de {kpis.totalEnrolled > 0 ? Math.round((kpis.totalParticipated / kpis.totalEnrolled) * 100) : 0}%
                        </div>
                      </div>

                      {/* KPI 3: Alunos Pendentes */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-xs font-mono">Alunos Pendentes</span>
                          <UserX className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-amber-400">
                          {kpis.totalPending}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Ainda sem atividade no filtro
                        </div>
                      </div>

                      {/* KPI 4: Média de Pontuação */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-xs font-mono">Média Geral</span>
                          <Award className="w-4 h-4 text-amber-300" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-amber-300">
                          {kpis.averageScore.toLocaleString()} pts
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Score médio dos participantes
                        </div>
                      </div>

                      {/* KPI 5: % de Acertos (Precisão) */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-xs font-mono">% de Acertos</span>
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className={`text-2xl font-bold font-mono ${kpis.accuracyPercentage >= 70 ? 'text-emerald-400' : kpis.accuracyPercentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {kpis.accuracyPercentage}%
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Acurácia nas questões
                        </div>
                      </div>

                      {/* KPI 6: Tempo Médio de Resposta */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-xs font-mono">Tempo Médio</span>
                          <Clock className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-sky-300">
                          {kpis.averageResponseTimeSeconds}s
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Por questão respondida
                        </div>
                      </div>

                      {/* KPI 7: Maior Nota */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-xs font-mono">Maior Nota</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-emerald-400">
                          {kpis.highestScore.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Destaque individual
                        </div>
                      </div>

                      {/* KPI 8: Menor Nota */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-xs font-mono">Menor Nota</span>
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-rose-400">
                          {kpis.lowestScore.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Atenção pedagógica
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Sector Difficulty & Intervention Map */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Desempenho por Domínio Conceitual (Setores 1 a 9)
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        Critério: &lt;60% de acertos requer intervenção do professor
                      </span>
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
                            <span
                              className={`font-bold ${
                                sec.accuracyPercent >= 70
                                  ? 'text-emerald-400'
                                  : sec.accuracyPercent >= 50
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {sec.accuracyPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                            <div
                              className={`h-full transition-all ${
                                sec.accuracyPercent >= 70
                                  ? 'bg-emerald-500'
                                  : sec.accuracyPercent >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.max(5, sec.accuracyPercent)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>
                              {sec.attemptsCount} resp. • {sec.avgTimeSeconds}s médio
                            </span>
                            {sec.needsIntervention && (
                              <span className="text-[10px] text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800">
                                REFORÇAR
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Telemetry Activity */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      Atividades Recentes de Telemetria (Últimas 25)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="p-2">Hora</th>
                            <th className="p-2">Aluno</th>
                            <th className="p-2">Setor / Questão</th>
                            <th className="p-2 text-center">Resultado</th>
                            <th className="p-2 text-right">Tempo</th>
                            <th className="p-2 text-right">Pontos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {recentEvents.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-500">
                                Nenhuma atividade registrada no período.
                              </td>
                            </tr>
                          ) : (
                            recentEvents.map((evt, idx) => (
                              <tr key={`${evt.attemptId}_${idx}`} className="hover:bg-slate-900/40">
                                <td className="p-2 text-slate-400">
                                  {new Date(evt.timestamp).toLocaleTimeString('pt-BR')}
                                </td>
                                <td className="p-2 font-bold text-white">{evt.studentName}</td>
                                <td className="p-2 text-slate-300">
                                  <span className="text-cyan-400">S{evt.sectorId}</span> • {evt.questionId}
                                </td>
                                <td className="p-2 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      evt.isCorrect
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                                    }`}
                                  >
                                    {evt.isCorrect ? 'ACERTO' : 'ERRO'}
                                  </span>
                                </td>
                                <td className="p-2 text-right text-slate-400">{evt.timeSpentSeconds}s</td>
                                <td className="p-2 text-right font-bold text-amber-300">
                                  +{evt.scoreAwarded}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==========================================
                  TAB 2: STUDENTS LIST & DETAILED PERFORMANCE
                  ========================================== */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      Alunos Matriculados ({filteredStudents.length})
                    </h4>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Buscar por nome, email ou turma..."
                        className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400 w-64 sm:w-80"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl bg-slate-950/60 border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Estudante</th>
                          <th className="p-3">Turma</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Pontos</th>
                          <th className="p-3 text-center">Resp. / Acertos</th>
                          <th className="p-3 text-center">Precisão</th>
                          <th className="p-3 text-center">Tempo Médio</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-slate-500">
                              Nenhum aluno localizado com o filtro aplicado.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-white">{s.name}</div>
                                <div className="text-[10px] text-slate-400">{s.email || s.id}</div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                                  {s.className}
                                </span>
                              </td>
                              <td className="p-3 text-center">
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
                              <td className="p-3 text-right font-bold text-amber-300">
                                {s.score.toLocaleString()}
                              </td>
                              <td className="p-3 text-center text-slate-300">
                                {s.totalAnswered} / {s.correctCount}
                              </td>
                              <td className="p-3 text-center font-bold">
                                <span
                                  className={
                                    s.accuracy >= 70
                                      ? 'text-emerald-400'
                                      : s.accuracy >= 50
                                      ? 'text-amber-400'
                                      : 'text-rose-400'
                                  }
                                >
                                  {s.accuracy}%
                                </span>
                              </td>
                              <td className="p-3 text-center text-slate-300">
                                {s.averageResponseTimeSeconds > 0 ? `${s.averageResponseTimeSeconds}s` : '—'}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleInspectStudent(s.id)}
                                  disabled={inspectLoading}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto"
                                >
                                  <span>Ver Relatório</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ==========================================
                  TAB 3: CLASSES MANAGEMENT (Criação & Listagem)
                  ========================================== */}
              {activeTab === 'classes' && (
                <div className="space-y-6">
                  {/* Create Class Form */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                    <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-cyan-400" />
                      Criar Nova Turma Escolar
                    </h4>
                    <p className="text-xs text-slate-400">
                      Gere turmas para separar turmas de Física (ex: 2º Ano A, Eletricidade Turma 1). Os alunos usam o código gerado para ingressar diretamente no jogo.
                    </p>

                    <form onSubmit={handleCreateClass} className="flex flex-col sm:flex-row gap-3 items-center">
                      <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="Nome da turma (ex: Física 2º Ano A)"
                        className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400"
                      />
                      <input
                        type="text"
                        value={newClassCode}
                        onChange={(e) => setNewClassCode(e.target.value.toUpperCase())}
                        placeholder="Código opcional (ex: FIS2026A)"
                        className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400 uppercase"
                      />
                      <button
                        type="submit"
                        disabled={isCreatingClass || !newClassName.trim()}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>{isCreatingClass ? 'CRIANDO...' : 'CRIAR TURMA'}</span>
                      </button>
                    </form>

                    {classCreateMsg && (
                      <p
                        className={`text-xs p-2.5 rounded-lg font-mono ${
                          classCreateMsg.type === 'success'
                            ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-950/50 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {classCreateMsg.text}
                      </p>
                    )}
                  </div>

                  {/* Created Classes List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      Suas Turmas Ativas ({teacherClasses.length})
                    </h4>

                    {teacherClasses.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-slate-500 font-mono text-xs">
                        Nenhuma turma cadastrada até o momento. Crie sua primeira turma acima para fornecer o código aos estudantes.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {teacherClasses.map((cls) => (
                          <div
                            key={cls.id}
                            className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm text-white font-mono">{cls.name}</h5>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Criada em {new Date(cls.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold shrink-0">
                                {cls.studentCount || 0} alunos
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                              <div>
                                <div className="text-[9px] text-slate-500 uppercase font-mono">Código de Acesso</div>
                                <div className="text-sm font-mono font-bold text-cyan-300 tracking-wider">
                                  {cls.code}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(cls.code)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Copiar código para enviar aos alunos"
                              >
                                {copiedCode === cls.code ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==========================================
                  TAB 4: QUESTIONS ANALYTICS ("Questões que exigem revisão")
                  ========================================== */}
              {activeTab === 'questions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Diagnóstico de Dificuldade por Questão
                      </h4>
                      <p className="text-xs text-slate-400">
                        Questões com taxa de erro superior a 50% são sinalizadas para intervenção pedagógica prioritária.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl bg-slate-950/60 border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Código Questão / Missão</th>
                          <th className="p-3">Setor Conceitual</th>
                          <th className="p-3 text-center">Tentativas</th>
                          <th className="p-3 text-center">Acertos</th>
                          <th className="p-3 text-center">Erros</th>
                          <th className="p-3 text-center">Taxa de Erro</th>
                          <th className="p-3 text-center">Tempo Médio</th>
                          <th className="p-3 text-center">Ação Docente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {questionsAnalytics.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-slate-500">
                              Nenhuma resposta computada para gerar matriz de dificuldade.
                            </td>
                          </tr>
                        ) : (
                          questionsAnalytics.map((q) => (
                            <tr key={q.questionId} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3 font-bold text-white">{q.questionId}</td>
                              <td className="p-3 text-slate-300">
                                S{q.sectorId}: {q.sectorName}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-200">{q.totalAttempts}</td>
                              <td className="p-3 text-center text-emerald-400 font-bold">{q.correctCount}</td>
                              <td className="p-3 text-center text-rose-400 font-bold">{q.errorCount}</td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                    q.errorRatePercentage >= 50
                                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  }`}
                                >
                                  {q.errorRatePercentage}%
                                </span>
                              </td>
                              <td className="p-3 text-center text-slate-400">
                                {q.averageTimeSeconds > 0 ? `${q.averageTimeSeconds}s` : '—'}
                              </td>
                              <td className="p-3 text-center">
                                {q.needsReview ? (
                                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/40 text-[10px] font-bold">
                                    REVISAR COM A TURMA
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">Adequado</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ==========================================
                  TAB 5: ATTEMPTS HISTORY LOG
                  ========================================== */}
              {activeTab === 'attempts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        Histórico Geral de Tentativas das Turmas
                      </h4>
                      <p className="text-xs text-slate-400">
                        Auditoria de tentativas com tempo de resolução e status de finalização.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl bg-slate-950/60 border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Data / Hora</th>
                          <th className="p-3">Aluno</th>
                          <th className="p-3">Missão / Questão</th>
                          <th className="p-3 text-center">Tipo</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Tempo</th>
                          <th className="p-3 text-right">Pontos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {attemptsLog.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-500">
                              Nenhuma tentativa registrada no histórico recente.
                            </td>
                          </tr>
                        ) : (
                          attemptsLog.map((att) => (
                            <tr key={att.attemptId} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3 text-slate-400">
                                {new Date(att.startedAt).toLocaleString('pt-BR')}
                              </td>
                              <td className="p-3 font-bold text-white">{att.studentName}</td>
                              <td className="p-3 text-slate-300">
                                {att.questionId || att.missionId}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                                  {att.type}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    att.status === 'COMPLETED'
                                      ? att.isCorrect
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                                      : att.status === 'TIMEOUT'
                                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {att.status === 'COMPLETED'
                                    ? att.isCorrect
                                      ? 'ACERTO'
                                      : 'ERRO'
                                    : att.status}
                                </span>
                              </td>
                              <td className="p-3 text-right text-slate-400">{att.elapsedSeconds}s</td>
                              <td className="p-3 text-right font-bold text-amber-300">+{att.score}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Base Autoritativa: SQLite-WAL ACID • 101 Questões de Física</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition-colors cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>

      </div>

      {/* ==========================================
          INSPECT STUDENT MODAL (Individual Detailed View)
          ========================================== */}
      {inspectStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-cyan-500/50 p-6 text-slate-100 overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setInspectStudent(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Relatório Pedagógico Individual: {inspectStudent.student.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {inspectStudent.student.email || inspectStudent.student.id} • Escola: {inspectStudent.student.school || 'Ares-3'} • Turma: {inspectStudent.student.className || 'Não vinculada'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono">Pontuação</div>
                  <div className="text-lg font-bold font-mono text-amber-300">
                    {inspectStudent.summary.score}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono">Precisão</div>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {inspectStudent.summary.accuracy}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono">Tempo Médio</div>
                  <div className="text-lg font-bold font-mono text-sky-400">
                    {inspectStudent.summary.averageTimeSeconds}s
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono">Setores Feitos</div>
                  <div className="text-lg font-bold font-mono text-cyan-400">
                    {inspectStudent.summary.completedSectorsCount} / 9
                  </div>
                </div>
              </div>

              {/* Sector Progress */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase">
                  Aproveitamento por Setor (1 a 9)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {inspectStudent.sectorProgress?.map((sec: any) => (
                    <div
                      key={sec.sectorId}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white">S{sec.sectorId}:</span> {sec.sectorName}
                        <div className="text-[10px] text-slate-400">
                          {sec.attemptsCount} questões ({sec.correctCount} acertos)
                        </div>
                      </div>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          sec.accuracyPercent >= 70
                            ? 'text-emerald-400 bg-emerald-950/60'
                            : sec.accuracyPercent >= 50
                            ? 'text-amber-400 bg-amber-950/60'
                            : 'text-rose-400 bg-rose-950/60'
                        }`}
                      >
                        {sec.accuracyPercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Attempts History for this student */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase">
                  Últimas Respostas Computadas
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[10px]">
                      <tr>
                        <th className="p-2">Hora</th>
                        <th className="p-2">Questão / Setor</th>
                        <th className="p-2 text-center">Opção</th>
                        <th className="p-2 text-center">Resultado</th>
                        <th className="p-2 text-right">Tempo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inspectStudent.recentAttempts?.map((a: any) => (
                        <tr key={a.attemptId}>
                          <td className="p-2 text-slate-400">
                            {new Date(a.answeredAt).toLocaleTimeString('pt-BR')}
                          </td>
                          <td className="p-2 text-white">
                            S{a.phaseId} • {a.questionId}
                          </td>
                          <td className="p-2 text-center text-slate-300">{a.selectedOption || '—'}</td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                a.isCorrect
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-rose-950 text-rose-400'
                              }`}
                            >
                              {a.isCorrect ? 'ACERTO' : 'ERRO'}
                            </span>
                          </td>
                          <td className="p-2 text-right text-slate-400">{a.timeSpentSeconds}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs cursor-pointer"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
