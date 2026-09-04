export type SectorId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Difficulty = 'facil' | 'medio' | 'dificil' | 'enem';

export interface SectorInfo {
  id: SectorId;
  name: string;
  subtitle: string;
  theme: string;
  icon: string;
  description: string;
  failureNarrative: string;
  successNarrative: string;
  requiredQuestionsCount: number;
  isEnem?: boolean;
}

export interface CircuitElement {
  id: string;
  type: 'battery' | 'resistor' | 'bulb' | 'switch' | 'ammeter' | 'voltmeter' | 'fuse' | 'ground' | 'node' | 'motor';
  label?: string;
  value?: number;
  unit?: string;
  state?: 'on' | 'off' | 'broken' | 'normal' | 'burning' | 'active';
  x?: number;
  y?: number;
}

export interface CircuitConfig {
  type: 'series' | 'parallel' | 'mixed' | 'single' | 'meter_test' | 'joule_cable' | 'power_grid' | 'final_core';
  voltage?: number;
  resistors?: { 
    id: string; 
    label: string; 
    value: number; 
    unit: string; 
    current?: number; 
    voltage?: number;
    state?: 'on' | 'off' | 'broken' | 'normal' | 'burning' | 'active' | string;
    color?: string;
  }[];
  elements?: CircuitElement[];
  description?: string;
  branches?: { id: string; name: string; resistors: number[]; current?: number }[];
  simplifySteps?: {
    step: number;
    description: string;
    groupResistors: string[];
    resultValue: number;
    resultLabel: string;
  }[];
}

export interface TieredHints {
  concept: string;
  formula: string;
  calculation: string;
}

export interface DetailedExplanation {
  formula: string;
  substitution: string;
  calculation: string;
  unit: string;
  conclusion: string;
}

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export interface ContextDataItem {
  label: string;
  value: string;
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

// Full question format (contains private answer key for server authority)
export interface Question {
  id: string;
  sectorId: SectorId;
  difficulty: Difficulty;
  difficultyLabel: string;
  topic: string;
  title: string;
  narrative: string;
  question: string;
  timeSeconds: number; // e.g. 120, 135, 150, 180, 210
  basePoints: number; // 100, 150, 250, 500
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  tigraoHint: string;
  hintsTiered?: TieredHints;
  detailedExplanation: DetailedExplanation;
  circuitConfig?: CircuitConfig;
  contextData?: ContextDataItem[];
  tableData?: TableData;
}

// Public question format sent to client browser (WITHOUT private correctAnswer)
export type QuestionPublic = Omit<Question, 'correctAnswer'>;

export interface QuestionAttempt {
  attemptId: string;
  questionId: string;
  sectorId: SectorId;
  uid: string;
  startedAt: number;
  deadlineAt: number;
  timeAllowedSeconds: number;
  usedHintLevel: 0 | 1 | 2 | 3;
  answered: boolean;
  selectedOptionId?: string;
  isCorrect?: boolean;
  scoreAwarded?: number;
  completedAt?: number;
}

export interface AttemptSubmissionResult {
  attemptId: string;
  isCorrect: boolean;
  isTimeout: boolean;
  livesRemaining: number;
  scoreAwarded: number;
  totalScore: number;
  detailedExplanation: DetailedExplanation;
  feedbackMessage: string;
  correctAnswerId?: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface EmergencySubmissionResult {
  attemptId: string;
  isCorrect: boolean;
  isTimeout: boolean;
  livesRemaining: number;
  totalScore: number;
  scoreResult?: {
    baseXP: number;
    speedBonus: {
      bonusXP: number;
      label: string;
      tier: 'supersonic' | 'fast' | 'steady' | 'close_call' | 'none';
    };
    comboMultiplier: number;
    comboBonusXP: number;
    totalXP: number;
  };
  errorDiagnosis?: {
    type: 'conceptual' | 'calculation' | 'unit' | 'interpretation';
    explanation: string;
  };
  expectedValue: number;
}

export interface TelemetryEvent {
  id: string;
  uid: string;
  timestamp: number;
  type: 
    | 'game_started'
    | 'sector_started'
    | 'sector_completed'
    | 'question_started'
    | 'question_answered'
    | 'question_timeout'
    | 'hint_used'
    | 'pause_used'
    | 'calculator_used'
    | 'lab_opened'
    | 'game_over'
    | 'victory_achieved'
    | 'achievement_unlocked';
  payload: Record<string, unknown>;
}

export interface LabComponent {
  id: string;
  type: 'dc_source' | 'resistor' | 'bulb' | 'switch' | 'fuse' | 'ammeter' | 'voltmeter';
  name: string;
  value: number;
  unit: string;
  state?: 'on' | 'off' | 'blown' | 'normal';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface AudioSettings {
  voiceVolume: number; // 0 to 1
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  isMuted: boolean;
  voiceEnabled: boolean;
  musicEnabled: boolean;
  voiceFilter: 'space_helmet' | 'clean_studio' | 'vintage_radio';
  voiceTone: 'energetic_young' | 'cheerful_kid' | 'heroic_cadet' | 'calm_mentor';
  selectedVoiceURI?: string;
}

export interface SolutionStep {
  id: string;
  title: string;
  description: string;
  formula?: string;
  substitution?: string;
  calculation?: string;
  result?: string;
  highlight?: string[];
}

export interface CircuitData {
  voltage: number;
  resistors: number[];
  configuration: 'series' | 'parallel' | 'mixed' | 'single';
  current?: number;
  equivalentResistance?: number;
  power?: number;
  labels?: string[];
  switches?: { id: string; closed: boolean; label: string }[];
  meters?: { type: 'voltmeter' | 'ammeter'; value: number; unit: string; targetComponentId?: string }[];
}

export type ErrorClassification = 'conceptual' | 'calculation' | 'interpretation' | 'unit';

export interface StepByStepSolutionProps {
  question?: Question | QuestionPublic;
  studentAnswer?: string;
  correctAnswer?: string;
  explanation?: SolutionStep[];
  circuit?: CircuitData;
  onContinue: () => void;
  errorType?: ErrorClassification;
  errorExplanation?: string;
}

export type EmergencyDifficulty = 'recruta' | 'engenheiro' | 'especialista' | 'comandante' | 'enem';

export interface MissionObjective {
  type: 'calculate_current' | 'calculate_voltage' | 'calculate_resistance' | 'calculate_power' | 'equivalent_resistance';
  expectedValue: number;
  tolerance?: number;
  promptText: string;
  unit: string;
  formulaUsed: string;
}

export interface MissionReward {
  xp: number;
  credits?: number;
  bonusXP?: number;
}

export interface EmergencyMissionOption {
  id: string;
  value: number;
  label: string;
  distractorReason?: string;
}

export interface EmergencyMission {
  id: string;
  title: string;
  narrative: string;
  subsystem: string;
  difficulty: EmergencyDifficulty;
  difficultyLabel: string;
  timeLimit: number; // e.g. 90, 75, 60 seconds
  voltage: number;
  circuit: CircuitData;
  objective: MissionObjective;
  reward: MissionReward;
  options: EmergencyMissionOption[];
  hints: string[];
  solutionSteps: SolutionStep[];
}

export type GameMode = 'campaign' | 'timeTrial' | 'emergency';

export interface GameStateData {
  status: 
    | 'MENU' 
    | 'COMO_JOGAR' 
    | 'CONTEUDOS' 
    | 'CONQUISTAS' 
    | 'INTRO' 
    | 'MAPA_ESTACAO' 
    | 'SECTOR_ACTIVE' 
    | 'SECTOR_COMPLETE' 
    | 'TIME_TRIAL'
    | 'VITORIA' 
    | 'GAME_OVER';
  playerName: string;
  lives: number; // 0 to 5
  maxLives: number; // default 5
  currentSectorId: SectorId | null;
  currentQuestionIndex: number;
  score: number;
  streak: number;
  maxStreak: number;
  stationIntegrity: number; // 0 - 100%
  correctAnswersCount: number;
  wrongAnswersCount: number;
  timeOutCount: number;
  hintsUsedCount: number;
  completedSectors: SectorId[];
  unlockedAchievements: string[];
  startTime: number;
  endTime?: number;
  soundEnabled: boolean;
}
