import { Question, SectorId } from '../../types';
import { SECTOR_1_QUESTIONS } from './sector1';
import { SECTOR_2_QUESTIONS } from './sector2';
import { SECTOR_3_QUESTIONS } from './sector3';
import { SECTOR_4_QUESTIONS } from './sector4';
import { SECTOR_5_QUESTIONS } from './sector5';
import { SECTOR_6_QUESTIONS } from './sector6';
import { SECTOR_7_QUESTIONS } from './sector7';
import { SECTOR_8_QUESTIONS } from './sector8';
import { ENEM_QUESTIONS } from './enem';

// Central +90 seconds extension to all questions (Easy, Medium, Hard, Special & ENEM)
const TIME_BONUS_SECONDS = 90;

function withExtendedTime(questions: Question[]): Question[] {
  return questions.map((q) => ({
    ...q,
    timeSeconds: (q.timeSeconds || 30) + TIME_BONUS_SECONDS,
  }));
}

export const ALL_QUESTIONS: Record<SectorId, Question[]> = {
  1: withExtendedTime(SECTOR_1_QUESTIONS),
  2: withExtendedTime(SECTOR_2_QUESTIONS),
  3: withExtendedTime(SECTOR_3_QUESTIONS),
  4: withExtendedTime(SECTOR_4_QUESTIONS),
  5: withExtendedTime(SECTOR_5_QUESTIONS),
  6: withExtendedTime(SECTOR_6_QUESTIONS),
  7: withExtendedTime(SECTOR_7_QUESTIONS),
  8: withExtendedTime(SECTOR_8_QUESTIONS),
  9: withExtendedTime(ENEM_QUESTIONS),
};

export function getSectorQuestions(sectorId: SectorId): Question[] {
  return ALL_QUESTIONS[sectorId] || [];
}

export function getTotalQuestionsCount(): number {
  return Object.values(ALL_QUESTIONS).reduce((acc, list) => acc + list.length, 0);
}

