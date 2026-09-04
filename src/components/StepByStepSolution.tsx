import React, { useState } from 'react';
import { 
  StepByStepSolutionProps, 
  SolutionStep, 
  ErrorClassification 
} from '../types';
import { 
  Brain, 
  Calculator, 
  Ruler, 
  Search, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  Sparkles, 
  ArrowRight,
  BookOpen,
  Zap,
  Activity
} from 'lucide-react';
import { TigraoMascot } from './TigraoMascot';
import { InteractiveCircuitDiagram } from './InteractiveCircuitDiagram';
import { sound } from '../utils/audio';

export const StepByStepSolution: React.FC<StepByStepSolutionProps> = ({
  question,
  studentAnswer,
  correctAnswer,
  explanation = [],
  circuit,
  onContinue,
  errorType = 'conceptual',
  errorExplanation,
}) => {
  // If no explicit steps provided, generate default steps from question.detailedExplanation
  const resolvedSteps: SolutionStep[] = explanation.length > 0
    ? explanation
    : question?.detailedExplanation
    ? [
        {
          id: 'step_1',
          title: '1. Diagnóstico e Dados do Enunciado',
          description: question.detailedExplanation.concept || 'Identifique as grandezas elétricas fornecidas pelo circuito.',
          formula: question.detailedExplanation.formula,
          highlight: [question.topic],
        },
        {
          id: 'step_2',
          title: '2. Substituição dos Valores na Equação',
          description: 'Substitua com precisão os valores numéricos na relação física:',
          formula: question.detailedExplanation.formula,
          substitution: question.detailedExplanation.substitution,
        },
        {
          id: 'step_3',
          title: '3. Execução do Cálculo Aritmético',
          description: question.detailedExplanation.calculation || 'Efetue a operação algébrica com rigor de decimais.',
          calculation: question.detailedExplanation.calculation,
          result: `${question.detailedExplanation.unit}`,
        },
        {
          id: 'step_4',
          title: '4. Conclusão e Resposta Correta',
          description: question.detailedExplanation.conclusion || 'Solução estabilizada no barramento da estação espacial.',
          result: `Alternativa Correta: ${correctAnswer || question.correctAnswer || ''}`,
        },
      ]
    : [
        {
          id: 'step_fallback',
          title: '1. Resolução Física',
          description: 'Aplique a Lei de Ohm e a conservação de energia elétrica para estabilizar o subsistema.',
          result: `Resposta Oficial: ${correctAnswer || ''}`,
        },
      ];

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [showAllSteps, setShowAllSteps] = useState<boolean>(false);

  const currentStep = resolvedSteps[currentStepIndex] || resolvedSteps[0];
  const isLastStep = currentStepIndex >= resolvedSteps.length - 1;

  const handleNextStep = () => {
    sound.playClick();
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    sound.playClick();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleToggleAll = () => {
    sound.playClick();
    setShowAllSteps((prev) => !prev);
  };

  // Error Classification Tag Details
  const getErrorTag = (type?: string) => {
    switch (type) {
      case 'conceptual':
        return {
          icon: <Brain className="w-5 h-5 text-purple-400" />,
          title: 'Erro Conceitual',
          badgeClass: 'bg-purple-950/80 border-purple-500/50 text-purple-300',
          defaultDesc: 'Você aplicou uma relação conceitual que não corresponde a esta configuração do circuito.',
        };
      case 'calculation':
        return {
          icon: <Calculator className="w-5 h-5 text-amber-400" />,
          title: 'Erro de Cálculo Aritmético',
          badgeClass: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          defaultDesc: 'O raciocínio físico está no rumo certo, mas houve um desvio na operação matemática.',
        };
      case 'unit':
        return {
          icon: <Ruler className="w-5 h-5 text-cyan-400" />,
          title: 'Erro de Unidade ou Prefixo',
          badgeClass: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
          defaultDesc: 'Atenção às ordens de grandeza (mili, quilo) e às unidades fundamentais do Sistema Internacional.',
        };
      case 'interpretation':
      default:
        return {
          icon: <Search className="w-5 h-5 text-rose-400" />,
          title: 'Erro de Interpretação',
          badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
          defaultDesc: 'A grandeza solicitada no comando da questão foi confundida com outra propriedade da estação.',
        };
    }
  };

  const errorTag = getErrorTag(errorType);

  return (
    <div
      id="step-by-step-solution-modal"
      className="w-full max-w-3xl mx-auto bg-slate-950 border border-cyan-500/50 rounded-3xl p-4 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6 text-slate-100 animate-fade-in"
    >
      {/* Header with Title and Error Diagnosis */}
      <div className="border-b border-cyan-500/20 pb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-mono text-cyan-300 tracking-tight">
                RESOLUÇÃO COMENTADA PASSO A PASSO
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Missão de Aprendizagem e Correção Pedagógica com Tigrão
              </p>
            </div>
          </div>

          {/* Error Tag Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold ${errorTag.badgeClass}`}
          >
            {errorTag.icon}
            <span>{errorTag.title}</span>
          </div>
        </div>

        {/* Diagnosis Explanation Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3 text-xs sm:text-sm">
          <div className="w-1.5 self-stretch rounded-full bg-cyan-400 shrink-0" />
          <div className="space-y-1">
            <div className="font-mono font-bold text-slate-300 flex items-center gap-2">
              <span>Diagnóstico da Falha:</span>
              {studentAnswer && (
                <span className="text-rose-400 line-through">Sua resposta: {studentAnswer}</span>
              )}
              {correctAnswer && (
                <span className="text-emerald-400 font-bold">Gabarito: {correctAnswer}</span>
              )}
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              {errorExplanation || errorTag.defaultDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Mascot Insight */}
      <TigraoMascot
        mood="thinking"
        speech={`Calma, Astronauta! Todo cientista comete erros antes de salvar uma estação. Vamos analisar etapa por etapa para fixar o conceito de vez na sua cabeça!`}
        size="md"
      />

      {/* Optional Interactive Circuit Visualization if provided */}
      {circuit && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
            <Activity className="w-4 h-4" />
            <span>ESQUEMA ELÉTRICO RELACIONADO:</span>
          </div>
          <InteractiveCircuitDiagram circuit={circuit} interactive={false} />
        </div>
      )}

      {/* Main Steps Carousel or Full List */}
      <div className="space-y-4">
        {/* Step Navigation Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            {resolvedSteps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCurrentStepIndex(idx);
                }}
                className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                  idx === currentStepIndex
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)] scale-110'
                    : idx < currentStepIndex
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
                title={s.title}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleAll}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showAllSteps ? 'Modo Guiado (1 por 1)' : 'Revelar Todas as Etapas'}</span>
          </button>
        </div>

        {/* Steps Container */}
        {showAllSteps ? (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {resolvedSteps.map((step, idx) => (
              <div
                key={step.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-cyan-300 uppercase">{step.title}</span>
                  <span className="text-slate-500">Etapa {idx + 1} de {resolvedSteps.length}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200">{step.description}</p>
                {step.formula && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs font-mono text-cyan-300">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Relação / Fórmula:</span>
                    <strong>{step.formula}</strong>
                  </div>
                )}
                {step.substitution && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/20 text-xs font-mono text-slate-300">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Substituição Numérica:</span>
                    <code>{step.substitution}</code>
                  </div>
                )}
                {step.result && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono text-emerald-300 font-bold">
                    Resultado: {step.result}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Guided Single Step View */
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-sm">{currentStep.title}</span>
              <span className="text-slate-400 font-bold">
                Etapa {currentStepIndex + 1} de {resolvedSteps.length}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {currentStep.description}
            </p>

            {/* Formula Block */}
            {currentStep.formula && (
              <div className="bg-slate-950 rounded-xl p-3 border border-cyan-500/30 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider block">
                  Equação Fundamental:
                </span>
                <div className="text-sm sm:text-base font-mono font-bold text-cyan-200">
                  {currentStep.formula}
                </div>
              </div>
            )}

            {/* Substitution Block */}
            {currentStep.substitution && (
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
                  Substituição Numérica:
                </span>
                <div className="text-xs sm:text-sm font-mono text-slate-200">
                  {currentStep.substitution}
                </div>
              </div>
            )}

            {/* Calculation / Arithmetic Block */}
            {currentStep.calculation && (
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
                  Passo Algébrico:
                </span>
                <div className="text-xs sm:text-sm font-mono text-amber-300">
                  {currentStep.calculation}
                </div>
              </div>
            )}

            {/* Step Result Block */}
            {currentStep.result && (
              <div className="bg-emerald-950/50 rounded-xl p-3 border border-emerald-500/40 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs sm:text-sm font-mono font-bold text-emerald-300">
                  {currentStep.result}
                </div>
              </div>
            )}

            {/* Guided Step Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                  currentStepIndex === 0
                    ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Etapa Anterior</span>
              </button>

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  <span>Próxima Etapa</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolução Completa!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="border-t border-cyan-500/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs font-mono text-slate-400 text-center sm:text-left">
          Fixe a teoria e tente novamente para recuperar o subsistema e proteger sua tripulação!
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onContinue();
          }}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black font-mono text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer flex items-center justify-center gap-2"
        >
          <span>ENTENDI, CONTINUAR MISSÃO</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
