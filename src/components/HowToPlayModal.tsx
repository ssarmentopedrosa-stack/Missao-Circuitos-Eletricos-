import React from 'react';
import { HelpCircle, X, CheckCircle2, ShieldCheck, Flame, Lightbulb, Zap, Award } from 'lucide-react';
import { sound } from '../utils/audio';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div id="how-to-play-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-cyan-500/40 rounded-3xl flex flex-col overflow-hidden shadow-[0_10px_50px_rgba(6,182,212,0.2)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-500/30 flex items-center justify-between gap-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Manual de Instruções do Astronauta
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Como Jogar — Missão Estação Orbital
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* Mission Objective */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-cyan-500/30 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Objetivo Principal</span>
            </h3>
            <p>
              A Estação Espacial Orbital ARES-III sofreu uma pane elétrica generalizada. Você e o cão astronauta <strong className="text-cyan-300">Tigrão</strong> devem percorrer os 8 setores da estação (desde a Central de Energia até o Núcleo de Fusão), diagnosticando e reparando os circuitos elétricos através da Física.
            </p>
          </div>

          {/* Core Mechanics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mecânica de Resolução</span>
              </div>
              <p className="text-xs text-slate-400">
                Analise o esquema elétrico interativo, identifique os valores de tensão (U), corrente (I) e resistências (R). Selecione a alternativa ou digite o valor numérico calculado e clique em <strong className="text-cyan-300">&quot;CONFIRMAR RESPOSTA&quot;</strong>.
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Dicas do Tigrão</span>
              </div>
              <p className="text-xs text-slate-400">
                Está com dúvidas conceituais? Clique em <strong className="text-amber-300">&quot;Pedir Dica&quot;</strong> para que o Tigrão dê orientações pedagógicas para guiar seu raciocínio físico sem entregar a resposta direta.
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Integridade da Estação</span>
              </div>
              <p className="text-xs text-slate-400">
                A estação começa com 100% de integridade. Respostas incorretas reduzem ligeiramente o escudo térmico, mas você sempre receberá a explicação completa e poderá tentar novamente até dominar o assunto!
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Pontuação e Combos</span>
              </div>
              <p className="text-xs text-slate-400">
                • Acerto na 1ª tentativa: <strong className="text-emerald-300">+100 pontos</strong>.<br />
                • Acerto após dica: <strong className="text-cyan-300">+60 pontos</strong>.<br />
                • Desafio final do Núcleo: <strong className="text-purple-300">+500 pontos</strong>.<br />
                • Sequências consecutivas de acertos multiplicam seu combo!
              </p>
            </div>
          </div>

          {/* Ranks */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-amber-500/30">
            <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Títulos de Engenharia Espacial</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-center">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-amber-800/40">
                <div className="text-amber-500 font-bold">🥉 Bronze</div>
                <div className="text-slate-200">Aprendiz da Eletricidade</div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                <div className="text-slate-300 font-bold">🥈 Prata</div>
                <div className="text-slate-200">Engenheiro da Estação</div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-amber-500/40">
                <div className="text-amber-400 font-bold">🥇 Ouro</div>
                <div className="text-amber-200 font-extrabold">Mestre dos Circuitos</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
