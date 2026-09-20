import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Award,
  Zap,
  Heart,
  TrendingUp,
  LogOut,
  Edit2,
  Check,
  Building2,
  GraduationCap,
  Users,
  Shield,
  Calendar,
  BookOpen,
  PlusCircle,
  Clock,
} from 'lucide-react';
import { User, GameStateData } from '../types';
import { AuthClient } from '../utils/authClient';

interface StudentPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  gameState: GameStateData;
  onUserUpdate: (updated: User) => void;
  onLogout: () => void;
}

export const StudentPerformanceModal: React.FC<StudentPerformanceModalProps> = ({
  isOpen,
  onClose,
  user,
  gameState,
  onUserUpdate,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(user.name);
  const [school, setSchool] = useState<string>(user.school || '');
  const [grade, setGrade] = useState<string>(user.grade || '');
  const [className, setClassName] = useState<string>(user.className || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Student Classes
  const [studentClasses, setStudentClasses] = useState<any[]>([]);
  const [classCodeInput, setClassCodeInput] = useState<string>('');
  const [isJoiningClass, setIsJoiningClass] = useState<boolean>(false);
  const [joinMsg, setJoinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Student Performance Telemetry
  const [performanceDetails, setPerformanceDetails] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      AuthClient.getStudentClasses().then((classes) => {
        setStudentClasses(classes || []);
      }).catch(() => {});

      if (user.id) {
        AuthClient.getStudentPerformance(user.id).then((perf) => {
          setPerformanceDetails(perf);
        }).catch(() => {});
      }
    }
  }, [isOpen, user.id]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg(null);
    try {
      const updated = await AuthClient.updateProfile({
        name: name.trim() || user.name,
        school: school.trim() || undefined,
        grade: grade || undefined,
        className: className.trim() || undefined,
      });
      onUserUpdate(updated);
      setIsEditing(false);
      setMsg('Perfil atualizado com sucesso!');
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(err.message || 'Erro ao atualizar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCodeInput.trim()) return;

    setIsJoiningClass(true);
    setJoinMsg(null);
    try {
      const res = await AuthClient.joinClass(classCodeInput.trim());
      setJoinMsg({
        type: 'success',
        text: `Sucesso! Você entrou na turma "${res.classItem.name}". Seu professor já pode acompanhar seu rendimento.`,
      });
      setClassCodeInput('');
      const updatedClasses = await AuthClient.getStudentClasses();
      setStudentClasses(updatedClasses || []);
    } catch (err: any) {
      setJoinMsg({
        type: 'error',
        text: err.message || 'Código de turma não encontrado.',
      });
    } finally {
      setIsJoiningClass(false);
    }
  };

  const totalQuestions = gameState.correctAnswersCount + gameState.wrongAnswersCount;
  const accuracy = totalQuestions > 0 ? Math.round((gameState.correctAnswersCount / totalQuestions) * 100) : 0;
  const avgTime = performanceDetails?.summary?.averageTimeSeconds || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 p-6 sm:p-8 overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-mono text-2xl font-bold shadow-lg shadow-cyan-500/20 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-mono text-white">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono uppercase">
                {user.role === 'teacher' ? 'Docente' : 'Astronauta'}
              </span>
            </div>
            <p className="text-xs text-slate-400">{user.email || 'Conta autoritativa da estação Ares-3'}</p>
            {(user.school || user.grade || user.className) && (
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                {user.school && <span>🏫 {user.school}</span>}
                {user.grade && <span>🎓 {user.grade}</span>}
                {user.className && <span>👥 {user.className}</span>}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancelar' : 'Editar Perfil'}</span>
          </button>
        </div>

        {msg && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs text-center font-mono">
            {msg}
          </div>
        )}

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Atualizar Dados Escolares
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Escola / Instituição</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Nome da escola"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Ano / Série</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Ex: 3º Ano EM"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Turma (opcional)</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Ex: Turma A"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Classes & Teacher Code Section */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Turma do Professor (Código de Acesso)
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Opcional • Não bloqueia o jogo</span>
          </div>

          <form onSubmit={handleJoinClass} className="flex gap-2">
            <input
              type="text"
              value={classCodeInput}
              onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
              placeholder="Digite o código da turma (ex: FIS2026A)"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono uppercase outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isJoiningClass || !classCodeInput.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isJoiningClass ? 'Entrando...' : 'Entrar na Turma'}</span>
            </button>
          </form>

          {joinMsg && (
            <p
              className={`text-xs p-2.5 rounded-lg font-mono ${
                joinMsg.type === 'success'
                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/50 text-rose-300 border border-rose-500/30'
              }`}
            >
              {joinMsg.text}
            </p>
          )}

          {studentClasses.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] text-slate-400 font-mono block mb-1.5">
                Turmas em que você está matriculado:
              </span>
              <div className="flex flex-wrap gap-2">
                {studentClasses.map((cls) => (
                  <span
                    key={cls.id}
                    className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3 h-3 text-cyan-400" />
                    <strong>{cls.name}</strong> (código: {cls.code})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics Cards */}
        <div className="mt-6 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            TELEMETRIA E RENDIMENTO NA MISSÃO
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                <Zap className="w-4 h-4 fill-cyan-400/30" />
                <span className="text-[10px] font-mono text-slate-400">PONTOS</span>
              </div>
              <p className="text-xl font-mono font-bold text-white">{gameState.score.toLocaleString()}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1 text-rose-400 mb-1">
                <Heart className="w-4 h-4 fill-rose-400/30" />
                <span className="text-[10px] font-mono text-slate-400">VIDAS</span>
              </div>
              <p className="text-xl font-mono font-bold text-white">{gameState.lives} / 5</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-mono text-slate-400">PRECISÃO</span>
              </div>
              <p className="text-xl font-mono font-bold text-white">{accuracy}%</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1 text-sky-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-mono text-slate-400">TEMPO MÉDIO</span>
              </div>
              <p className="text-xl font-mono font-bold text-white">{avgTime > 0 ? `${avgTime}s` : '—'}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800/50">
              <span>Questões Respondidas Corretas</span>
              <span className="font-mono text-emerald-400 font-bold">{gameState.correctAnswersCount}</span>
            </div>
            <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800/50">
              <span>Respostas Incorretas</span>
              <span className="font-mono text-rose-400 font-bold">{gameState.wrongAnswersCount}</span>
            </div>
            <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800/50">
              <span>Sequência Recorde (Streak)</span>
              <span className="font-mono text-cyan-400 font-bold">{gameState.maxStreak} acertos seguidos</span>
            </div>
            <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800/50">
              <span>Setores Concluídos</span>
              <span className="font-mono text-cyan-400 font-bold">{gameState.completedSectors.length} de 9</span>
            </div>
            <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800/50">
              <span>Dicas Utilizadas</span>
              <span className="font-mono text-amber-400 font-bold">{gameState.hintsUsedCount}</span>
            </div>
            <div className="flex justify-between text-slate-400 py-1">
              <span>Data de Criação da Conta</span>
              <span className="font-mono text-slate-300">
                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Sessão</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            Voltar ao Jogo
          </button>
        </div>
      </div>
    </div>
  );
};
