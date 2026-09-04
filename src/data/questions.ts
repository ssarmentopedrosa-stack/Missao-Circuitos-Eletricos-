import { Question, SectorId } from '../types';
import { ALL_QUESTIONS, getSectorQuestions, getTotalQuestionsCount } from './questions/index';
import { ACHIEVEMENTS_LIST } from './achievements';

// Re-export all individual sector questions, database and achievements
export { 
  ALL_QUESTIONS,
  getSectorQuestions,
  getTotalQuestionsCount,
  ACHIEVEMENTS_LIST
};

// Flattened database for global access
export const QUESTIONS_DATABASE: Question[] = Object.values(ALL_QUESTIONS).flat();

export function getQuestionsForSector(sectorId: SectorId): Question[] {
  return ALL_QUESTIONS[sectorId] || [];
}

