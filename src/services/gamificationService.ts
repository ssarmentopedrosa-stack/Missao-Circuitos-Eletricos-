/**
 * Gamification Service for Missão Circuitos Elétricos 2.0
 * Calculates speed bonuses, combo multipliers, ranks, and tracks Time Trial metrics.
 */

export interface SpeedBonusBreakdown {
  bonusXP: number;
  label: string;
  tier: 'supersonic' | 'fast' | 'steady' | 'close_call' | 'none';
}

export interface ScoreCalculationResult {
  baseXP: number;
  speedBonus: SpeedBonusBreakdown;
  comboMultiplier: number;
  comboBonusXP: number;
  totalXP: number;
}

export interface TimeTrialProgress {
  completedMissionIds: string[];
  totalXP: number;
  highestCombo: number;
  bestTimes: Record<string, number>; // missionId -> remainingSeconds
}

const TIME_TRIAL_STORAGE_KEY = 'circuits_mission_time_trial_v2';

export function calculateSpeedBonus(
  timeRemainingSeconds: number,
  timeAllowedSeconds: number
): SpeedBonusBreakdown {
  const safeAllowed = Number.isFinite(timeAllowedSeconds) && timeAllowedSeconds > 0 ? timeAllowedSeconds : 90;
  const safeRemaining = Number.isFinite(timeRemainingSeconds)
    ? Math.max(0, Math.min(safeAllowed, timeRemainingSeconds))
    : 0;

  if (safeRemaining <= 0) {
    return { bonusXP: 0, label: 'Tempo Esgotado', tier: 'none' };
  }

  // Tier 1: > 60s remaining
  if (safeRemaining >= 60) {
    return { bonusXP: 200, label: '⚡ Velocidade Hipersônica (+200 XP)', tier: 'supersonic' };
  }
  // Tier 2: 30s - 59s
  if (safeRemaining >= 30) {
    return { bonusXP: 150, label: '🚀 Diagnóstico Ágil (+150 XP)', tier: 'fast' };
  }
  // Tier 3: 10s - 29s
  if (safeRemaining >= 10) {
    return { bonusXP: 75, label: '⏱️ Resposta Firme (+75 XP)', tier: 'steady' };
  }
  // Tier 4: < 10s
  return { bonusXP: 25, label: '⚠️ No Limiar do Disjuntor (+25 XP)', tier: 'close_call' };
}

export function calculateMissionScore(
  basePoints: number,
  timeRemainingSeconds: number,
  timeAllowedSeconds: number,
  comboCount: number
): ScoreCalculationResult {
  const safeBase = Number.isFinite(basePoints) ? Math.max(0, Math.round(basePoints)) : 0;
  const speedBonus = calculateSpeedBonus(timeRemainingSeconds, timeAllowedSeconds);
  
  // Combo multiplier: combo 0 or 1 = 1.0x, combo 2 = 1.2x, combo 3 = 1.4x, etc. Strictly capped at 2.0x
  const safeCombo = Number.isFinite(comboCount) ? Math.max(0, Math.floor(comboCount)) : 0;
  const multiplier = safeCombo >= 2 ? Math.min(2.0, Math.max(1.0, 1 + (safeCombo - 1) * 0.2)) : 1.0;
  
  const subtotal = safeBase + speedBonus.bonusXP;
  const comboBonusXP = Math.max(0, Math.round(subtotal * (multiplier - 1)));
  const totalXP = Math.max(0, Math.round(subtotal * multiplier));

  return {
    baseXP: safeBase,
    speedBonus,
    comboMultiplier: Number(multiplier.toFixed(2)),
    comboBonusXP,
    totalXP,
  };
}

export function getTimeTrialProgress(): TimeTrialProgress {
  try {
    const raw = localStorage.getItem(TIME_TRIAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    completedMissionIds: [],
    totalXP: 0,
    highestCombo: 0,
    bestTimes: {},
  };
}

export function saveTimeTrialProgress(
  missionId: string,
  earnedXP: number,
  timeRemainingSeconds: number,
  comboCount: number
): TimeTrialProgress {
  const current = getTimeTrialProgress();

  if (!current.completedMissionIds.includes(missionId)) {
    current.completedMissionIds.push(missionId);
  }

  current.totalXP += earnedXP;
  if (comboCount > current.highestCombo) {
    current.highestCombo = comboCount;
  }

  const previousBest = current.bestTimes[missionId] ?? 0;
  if (timeRemainingSeconds > previousBest) {
    current.bestTimes[missionId] = timeRemainingSeconds;
  }

  try {
    localStorage.setItem(TIME_TRIAL_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // storage error ignored
  }

  return current;
}
