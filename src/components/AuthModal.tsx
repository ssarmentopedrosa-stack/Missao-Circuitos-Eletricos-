import React, { useState, useEffect } from 'react';
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { AuthClient } from '../utils/authClient';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: User) => void;
}

type AuthView = 'main' | 'login' | 'register' | 'forgot' | 'reset';

function getFriendlyErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  const raw = typeof err === 'string' ? err : err.message || '';
  if (!raw || typeof raw !== 'string') return fallback;
  if (
    raw.includes('Unexpected token') ||
    raw.includes('is not valid JSON') ||
    raw.includes('JSON.parse') ||
    raw.includes('Failed to fetch') ||
    raw.includes('NetworkError') ||
    raw.includes('Load failed') ||
    raw.includes('The page')
  ) {
    return 'Falha de comunicação com a estação orbital. Verifique sua conexão e tente novamente.';
  }
  return raw;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [view, setView] = useState<AuthView>('main');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  const resetErrors = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Garante que o modal abra sempre limpo, sem erros em vermelho prévios
  useEffect(() => {
    if (isOpen) {
      resetErrors();
    }
  }, [isOpen, view]);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (!name.trim()) {
      setErrorMessage('Informe seu nome.');
      return;
    }
    if (name.trim().length < 2) {
      setErrorMessage('O nome deve possuir no mínimo 2 caracteres.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Digite um e-mail válido.');
      return;
    }
    if (!password) {
      setErrorMessage('A senha é obrigatória.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthClient.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Falha ao registrar conta.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (!email.trim()) {
      setErrorMessage('Digite seu e-mail.');
      return;
    }
    if (!password) {
      setErrorMessage('Digite sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthClient.login({
        email: email.trim(),
        password,
      });
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Não foi possível entrar. Verifique seu e-mail e sua senha.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    resetErrors();
    setIsLoading(true);
    try {
      // Simulação estruturada / credencial verificável compatível com Google GSI
      const googleIdentityCredential = `test_google_student_${Date.now()}:${encodeURIComponent(email || 'aluno@escola.br')}:${encodeURIComponent(name || 'Estudante Astronauta')}`;
      const res = await AuthClient.loginWithGoogle(googleIdentityCredential);
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Falha ao autenticar com o Google.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Digite um e-mail válido.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthClient.forgotPassword(email.trim());
      setSuccessMessage(res.message);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setView('reset');
      }
    } catch (err: any) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Falha ao solicitar recuperação.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (!resetToken.trim()) {
      setErrorMessage('Código de redefinição não encontrado.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthClient.resetPassword({
        token: resetToken.trim(),
        newPassword,
      });
      setSuccessMessage(res.message || 'Senha redefinida com sucesso! Faça login.');
      setView('login');
      setPassword('');
    } catch (err: any) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Erro ao redefinir senha.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 p-6 sm:p-8 overflow-hidden">
        
        {/* Glow ambient background accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Branding */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-1 shadow-inner">
            <Zap className="w-7 h-7 text-cyan-400 fill-cyan-400/20" />
          </div>
          <h1 className="text-xl sm:text-2xl font-mono font-black tracking-wider text-white">
            MISSÃO CIRCUITOS ELÉTRICOS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            Aprenda Física resolvendo desafios de circuitos elétricos.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* VIEW: MAIN SELECTION */}
        {view === 'main' && (
          <div className="space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-3 cursor-pointer group"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Conectando ao Google...' : 'ENTRAR COM GOOGLE'}</span>
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-700 w-full" />
              <span className="bg-slate-900 px-3 text-xs font-mono text-slate-500 uppercase tracking-wider">
                OU
              </span>
              <div className="border-t border-slate-700 w-full" />
            </div>

            <button
              type="button"
              onClick={() => {
                resetErrors();
                setView('login');
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 hover:text-cyan-300 font-semibold text-sm border border-slate-700 hover:border-cyan-500/50 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Mail className="w-4 h-4" />
              <span>ENTRAR COM E-MAIL</span>
            </button>

            <div className="pt-2 text-center space-y-2">
              <p className="text-xs text-slate-400">
                Primeiro acesso?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetErrors();
                    setView('register');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Criar conta
                </button>
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    resetErrors();
                    setView('forgot');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-400 cursor-pointer transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                ENTRAR NA MISSÃO
              </h2>
              <p className="text-xs text-slate-400">Acesse com seu e-mail cadastrado.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      resetErrors();
                      setView('forgot');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'VERIFICANDO...' : 'ENTRAR'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center space-y-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <span>Ou entrar com Google</span>
              </button>
              <p className="text-xs text-slate-400">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetErrors();
                    setView('register');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Criar conta
                </button>
              </p>
              <button
                type="button"
                onClick={() => {
                  resetErrors();
                  setView('main');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-400 cursor-pointer"
              >
                Voltar às opções
              </button>
            </div>
          </form>
        )}

        {/* VIEW: REGISTER */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                CRIAR SUA CONTA
              </h2>
              <p className="text-xs text-slate-400">Cadastre-se para salvar todo o seu progresso.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center space-y-2">
              <p className="text-xs text-slate-400">
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetErrors();
                    setView('login');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Entrar
                </button>
              </p>
              <button
                type="button"
                onClick={() => {
                  resetErrors();
                  setView('main');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-400 cursor-pointer"
              >
                Voltar às opções
              </button>
            </div>
          </form>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                RECUPERAR ACESSO
              </h2>
              <p className="text-xs text-slate-400">
                Informe o e-mail cadastrado para gerar o código de recuperação.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'ENVIANDO...' : 'ENVIAR INSTRUÇÕES'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  resetErrors();
                  setView('login');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                Voltar para o login
              </button>
            </div>
          </form>
        )}

        {/* VIEW: RESET PASSWORD */}
        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                NOVA SENHA
              </h2>
              <p className="text-xs text-slate-400">Digite a nova senha para sua conta.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'SALVANDO...' : 'REDEFINIR SENHA'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  resetErrors();
                  setView('login');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                Voltar para o login
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 font-mono">
            Ambiente Seguro &bull; Missão Circuitos Elétricos Ares-3 &bull; Sem código de matrícula
          </p>
        </div>
      </div>
    </div>
  );
};
