/**
 * Physics mathematical calculations and validation utilities for electrical circuits
 */

export function calcResistorsSeries(resistors: number[]): number {
  return resistors.reduce((sum, r) => sum + r, 0);
}

export function calcResistorsParallel(resistors: number[]): number {
  if (resistors.length === 0) return 0;
  if (resistors.some((r) => r <= 0)) return 0;
  
  if (resistors.length === 2) {
    return (resistors[0] * resistors[1]) / (resistors[0] + resistors[1]);
  }
  
  const sumInverse = resistors.reduce((sum, r) => sum + 1 / r, 0);
  return 1 / sumInverse;
}

export function calcCurrent(voltage: number, resistance: number): number {
  if (resistance <= 0) return 0;
  return voltage / resistance;
}

export function calcVoltage(current: number, resistance: number): number {
  return current * resistance;
}

export function calcResistance(voltage: number, current: number): number {
  if (current <= 0) return 0;
  return voltage / current;
}

export function calcPowerVI(voltage: number, current: number): number {
  return voltage * current;
}

export function calcPowerRI2(resistance: number, current: number): number {
  return resistance * Math.pow(current, 2);
}

export function calcPowerV2R(voltage: number, resistance: number): number {
  if (resistance <= 0) return 0;
  return Math.pow(voltage, 2) / resistance;
}

export function calcEnergyKWh(powerWatts: number, timeHours: number): number {
  return (powerWatts * timeHours) / 1000;
}

export function calcEnergyJoules(powerWatts: number, timeSeconds: number): number {
  return powerWatts * timeSeconds;
}

export function calcJouleHeat(resistance: number, current: number, timeSeconds: number): number {
  return resistance * Math.pow(current, 2) * timeSeconds;
}

/**
 * Validates a user's answer against the correct answer.
 * Handles strings, numbers, decimals with commas or points, and tolerances.
 */
export function checkAnswer(
  userAnswer: string | number,
  correctAnswer: string | number,
  tolerance: number = 0.05
): boolean {
  if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
    // If it's a multiple choice ID or exact text
    const cleanUser = userAnswer.trim().toUpperCase();
    const cleanCorrect = correctAnswer.trim().toUpperCase();
    if (cleanUser === cleanCorrect) return true;

    // Check if both are parseable numbers
    const numUser = parseFloat(userAnswer.replace(',', '.').trim());
    const numCorrect = parseFloat(correctAnswer.replace(',', '.').trim());

    if (!isNaN(numUser) && !isNaN(numCorrect)) {
      if (numCorrect === 0) return Math.abs(numUser) <= 0.01;
      return Math.abs((numUser - numCorrect) / numCorrect) <= tolerance || Math.abs(numUser - numCorrect) <= 0.05;
    }
  }

  if (typeof correctAnswer === 'number') {
    const numUser = typeof userAnswer === 'number' 
      ? userAnswer 
      : parseFloat(String(userAnswer).replace(',', '.').trim());
    if (isNaN(numUser)) return false;
    if (correctAnswer === 0) return Math.abs(numUser) <= 0.01;
    return Math.abs((numUser - correctAnswer) / correctAnswer) <= tolerance || Math.abs(numUser - correctAnswer) <= 0.05;
  }

  return false;
}

export function formatNumber(val: number, decimals: number = 2): string {
  if (Number.isInteger(val)) return val.toString();
  return Number(val.toFixed(decimals)).toString().replace('.', ',');
}
