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

export interface Question {
  id: string;
  sectorId: SectorId;
  difficulty: Difficulty;
  difficultyLabel: string;
  topic: string;
  title: string;
  narrative: string;
  question: string;
  timeSeconds: number; // e.g. 30, 45, 60, 90, 120
  basePoints: number; // 100, 150, 250, 500
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  tigraoHint: string;
  detailedExplanation: DetailedExplanation;
  circuitConfig?: CircuitConfig;
  contextData?: ContextDataItem[];
  tableData?: TableData;
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
    | 'VITORIA' 
    | 'GAME_OVER';
  playerName: string;
  lives: number; // 0 to 3
  maxLives: number; // default 3
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
