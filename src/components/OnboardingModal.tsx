import React, { useState } from 'react';
import { Rocket, GraduationCap, Building2, Users, ArrowRight, Sparkles } from 'lucide-react';
import { AuthClient } from '../utils/authClient';
import { User } from '../types';

interface OnboardingModalProps {
  user: User;
  isOpen: boolean;
  onComplete: (updatedUser: User) => void;
}

const GRADE_OPTIONS = [
  { value: '', label: 'Selecione sua série (opcional)' },
  { value: '1_EM', label: '1º Ano do Ensino Médio' },
  { value: '2_EM', label: '2º Ano do Ensino Médio' },
  { value: '3_EM', label: '3º Ano do Ensino Médio' },
  { value: 'EF_9', label: '9º Ano do Ensino Fundamental' },
  { value: 'SUPERIOR', label: 'Ensino Superior / Técnico' },
  { value: 'OUTRO', label: 'Outro / Autodidata' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ user, isOpen, onComplete }) => {
  const [name, setName] = useState<string>(user.name || '');
  const [grade, setGrade] = useState<string>(user.grade || '');
  const [className, setClassName] = useState<string>(user.className || '');
  const [classCode, setClassCode] = useState<string>('');
  const [school, setSchool] = useState<string>(user.school || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const updated = await AuthClient.updateProfile({
        name: name.trim() || user.name,
        grade: grade || undefined,
        className: className.trim() || undefined,
        school: school.trim() || undefined,
        onboardingCompleted: true,
      });

      if (classCode.trim()) {
        try {
          await AuthClient.joinClass(classCode.trim());
        } catch {
          // Ignora se o código for inválido no onboarding para não travar a entrada
        }
      }

      onComplete(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar suas informações.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 p-6 sm:p-8 overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-1 shadow-inner">
            <Rocket className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-mono font-black tracking-wider text-white">
            BEM-VINDO À MISSÃO!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Antes de começar, conte um pouco sobre você para personalizarmos sua jornada na Ares-3.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Como gostaria de ser chamado na tripulação?
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome ou apelido de astronauta"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
            />
          </div>

          {/* Série / Ano (Opcional) */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
              Ano / Série <span className="text-slate-500 text-[10px] lowercase">(opcional)</span>
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all cursor-pointer"
            >
              {GRADE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Turma (Opcional) */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Turma <span className="text-slate-500 text-[10px] lowercase">(opcional - ex: Turma A, 201)</span>
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Identificação da sua turma escolar se houver"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
            />
          </div>

          {/* Escola / Instituição (Opcional) */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Escola / Colégio <span className="text-slate-500 text-[10px] lowercase">(opcional)</span>
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Nome da sua escola ou colégio"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
            />
          </div>

          {/* Código da Turma do Professor (Opcional) */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Código da Turma</span>
              <span className="text-cyan-400 text-[10px] lowercase">fornecido pelo professor (opcional)</span>
            </label>
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="Ex: FIS2026A (deixe em branco se não tiver)"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm font-mono uppercase transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-mono text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? 'PREPARANDO SISTEMAS...' : 'COMEÇAR MISSÃO'}</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </form>

        <div className="mt-5 text-center">
          <p className="text-[11px] text-slate-500">
            Nenhum código de matrícula ou código de turma é necessário para jogar.
          </p>
        </div>
      </div>
    </div>
  );
};
