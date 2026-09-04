/**
 * Circuit Calculations & Physics Pedagogical Diagnostic Utilities
 * Ensures high-school physics accuracy with float precision tolerance.
 */

import { CircuitData, ErrorClassification } from '../types';

export const EPSILON_DEFAULT = 0.05;

/**
 * Calculates Equivalent Resistance (Req) based on circuit topology.
 */
export function calculateEquivalentResistance(
  resistors: number[],
  config: 'series' | 'parallel' | 'mixed' | 'single' = 'series'
): number {
  if (!resistors || resistors.length === 0) return 0;
  if (resistors.length === 1 || config === 'single') return resistors[0];

  if (config === 'series') {
    // Req = R1 + R2 + ... + Rn
    return resistors.reduce((sum, r) => sum + r, 0);
  }

  if (config === 'parallel') {
    // 1/Req = 1/R1 + 1/R2 + ... + 1/Rn
    const zeroResistor = resistors.find((r) => r <= 0);
    if (zeroResistor !== undefined) return 0; // Short circuit
    const inverseSum = resistors.reduce((sum, r) => sum + 1 / r, 0);
    return inverseSum > 0 ? 1 / inverseSum : 0;
  }

  if (config === 'mixed') {
    // Standard didactic mixed topology: R1 in series with (R2 // R3)
    if (resistors.length === 2) {
      return resistors[0] + resistors[1];
    }
    if (resistors.length >= 3) {
      const r1 = resistors[0];
      const r2 = resistors[1];
      const r3 = resistors[2];
      const parallelBranch = (r2 * r3) / (r2 + r3);
      const remaining = resistors.slice(3).reduce((sum, r) => sum + r, 0);
      return r1 + parallelBranch + remaining;
    }
  }

  return resistors.reduce((sum, r) => sum + r, 0);
}

/**
 * Ohm's First Law: I = V / R
 */
export function calculateCurrent(voltage: number, resistance: number): number {
  if (resistance <= 0) return 0;
  return voltage / resistance;
}

/**
 * Ohm's First Law: V = R * I
 */
export function calculateVoltage(resistance: number, current: number): number {
  return resistance * current;
}

/**
 * Electric Power: P = V * I = R * I^2 = V^2 / R
 */
export function calculatePower(voltage: number, current: number, resistance?: number): number {
  if (voltage > 0 && current > 0) {
    return voltage * current;
  }
  if (resistance && resistance > 0 && current > 0) {
    return resistance * Math.pow(current, 2);
  }
  if (voltage > 0 && resistance && resistance > 0) {
    return Math.pow(voltage, 2) / resistance;
  }
  return 0;
}

/**
 * Safe numeric comparison with relative & absolute tolerance
 */
export function areValuesEqual(val1: number, val2: number, tolerance: number = EPSILON_DEFAULT): boolean {
  if (isNaN(val1) || isNaN(val2)) return false;
  const diff = Math.abs(val1 - val2);
  if (diff <= tolerance) return true;
  // Relative tolerance for large numbers
  const maxVal = Math.max(Math.abs(val1), Math.abs(val2));
  return maxVal > 0 ? diff / maxVal <= tolerance : true;
}

/**
 * Clean formatting of float values with units
 */
export function formatFloat(num: number, decimals: number = 2): string {
  if (Number.isInteger(num)) return num.toString();
  const fixed = num.toFixed(decimals);
  // Remove trailing zeros: e.g. 2.50 -> 2.5
  return parseFloat(fixed).toString();
}

/**
 * Calculates per-component branches and drops for a given circuit
 */
export interface ComponentElectricalState {
  id: string;
  label: string;
  resistance: number;
  voltageDrop: number;
  current: number;
  power: number;
}

export function analyzeCircuitTopology(circuit: CircuitData): {
  req: number;
  totalCurrent: number;
  totalPower: number;
  components: ComponentElectricalState[];
} {
  const { voltage, resistors, configuration, labels = [] } = circuit;
  const req = calculateEquivalentResistance(resistors, configuration);
  const totalCurrent = req > 0 ? calculateCurrent(voltage, req) : 0;
  const totalPower = calculatePower(voltage, totalCurrent);

  const components: ComponentElectricalState[] = [];

  if (configuration === 'series' || configuration === 'single') {
    resistors.forEach((r, idx) => {
      const compI = totalCurrent;
      const compV = r * compI;
      const compP = compV * compI;
      components.push({
        id: `R${idx + 1}`,
        label: labels[idx] || `Resistor R${idx + 1}`,
        resistance: r,
        voltageDrop: compV,
        current: compI,
        power: compP,
      });
    });
  } else if (configuration === 'parallel') {
    resistors.forEach((r, idx) => {
      const compV = voltage; // Equal voltage in parallel
      const compI = r > 0 ? compV / r : 0;
      const compP = compV * compI;
      components.push({
        id: `R${idx + 1}`,
        label: labels[idx] || `Resistor R${idx + 1}`,
        resistance: r,
        voltageDrop: compV,
        current: compI,
        power: compP,
      });
    });
  } else if (configuration === 'mixed') {
    // R1 in series with (R2 // R3)
    if (resistors.length >= 3) {
      const r1 = resistors[0];
      const r2 = resistors[1];
      const r3 = resistors[2];
      const parallelReq = (r2 * r3) / (r2 + r3);
      const v1 = r1 * totalCurrent;
      const vParallel = voltage - v1;
      const i2 = parallelReq > 0 ? vParallel / r2 : 0;
      const i3 = parallelReq > 0 ? vParallel / r3 : 0;

      components.push({
        id: 'R1',
        label: labels[0] || 'Resistor R1 (Tronco Principal)',
        resistance: r1,
        voltageDrop: v1,
        current: totalCurrent,
        power: v1 * totalCurrent,
      });
      components.push({
        id: 'R2',
        label: labels[1] || 'Resistor R2 (Ramo Superior)',
        resistance: r2,
        voltageDrop: vParallel,
        current: i2,
        power: vParallel * i2,
      });
      components.push({
        id: 'R3',
        label: labels[2] || 'Resistor R3 (Ramo Inferior)',
        resistance: r3,
        voltageDrop: vParallel,
        current: i3,
        power: vParallel * i3,
      });
    }
  }

  return {
    req,
    totalCurrent,
    totalPower,
    components,
  };
}

/**
 * Diagnoses pedagogical error type based on student answer and common physics traps
 */
export function diagnoseErrorType(
  studentAnswer: number | string,
  expectedAnswer: number | string,
  context: {
    voltage?: number;
    resistors?: number[];
    config?: 'series' | 'parallel' | 'mixed' | 'single';
    targetType?: 'current' | 'voltage' | 'resistance' | 'power';
  } = {}
): { type: ErrorClassification; explanation: string } {
  const studentNum = typeof studentAnswer === 'number' ? studentAnswer : parseFloat(studentAnswer);
  const expectedNum = typeof expectedAnswer === 'number' ? expectedAnswer : parseFloat(expectedAnswer);

  if (isNaN(studentNum) || isNaN(expectedNum)) {
    return {
      type: 'interpretation',
      explanation: 'A resposta selecionada não condiz com a grandeza solicitada no enunciado.',
    };
  }

  const { voltage, resistors = [], config, targetType } = context;

  // 1. Check unit scaling error (factor of 10, 100, 1000 like mA vs A or kW vs W)
  const ratio = studentNum / expectedNum;
  if (areValuesEqual(ratio, 1000) || areValuesEqual(ratio, 0.001)) {
    return {
      type: 'unit',
      explanation: 'Atenção aos prefixos métricos! Você provavelmente confundiu mili (m, 10⁻³) ou quilo (k, 10³) com as unidades do Sistema Internacional (A, V, Ω, W).',
    };
  }
  if (areValuesEqual(ratio, 10) || areValuesEqual(ratio, 0.1) || areValuesEqual(ratio, 100) || areValuesEqual(ratio, 0.01)) {
    return {
      type: 'calculation',
      explanation: 'Erro de ordem de grandeza ou vírgula decimal durante a divisão/multiplicação.',
    };
  }

  // 2. Check formula inversion (e.g. R = V * I instead of V / I, or I = V * R)
  if (voltage && resistors.length > 0) {
    const r = resistors[0];
    if (targetType === 'current' && areValuesEqual(studentNum, voltage * r)) {
      return {
        type: 'conceptual',
        explanation: 'Você multiplicou a tensão pela resistência (V · R). Pela Primeira Lei de Ohm, a corrente é a razão entre tensão e resistência: I = V / R.',
      };
    }
    if (targetType === 'resistance' && voltage && areValuesEqual(studentNum, voltage * expectedNum)) {
      return {
        type: 'conceptual',
        explanation: 'Pela Lei de Ohm, R = V / I. Multiplicar V por I gera uma grandeza incorreta.',
      };
    }
  }

  // 3. Check series vs parallel confusion
  if (config === 'parallel' && resistors.length >= 2) {
    const seriesSum = resistors.reduce((a, b) => a + b, 0);
    if (areValuesEqual(studentNum, seriesSum)) {
      return {
        type: 'conceptual',
        explanation: 'Você somou os resistores diretamente como se estivessem em série (Req = R1 + R2)! Em paralelo, a resistência equivalente é dada por 1/Req = 1/R1 + 1/R2 (ou produto pela soma: Req = (R1·R2)/(R1+R2)), resultando sempre em um valor menor que qualquer um dos ramos.',
      };
    }
  }

  if (config === 'series' && resistors.length === 2) {
    const productOverSum = (resistors[0] * resistors[1]) / (resistors[0] + resistors[1]);
    if (areValuesEqual(studentNum, productOverSum)) {
      return {
        type: 'conceptual',
        explanation: 'Você aplicou a fórmula de resistores em paralelo em um circuito em série! Em série, toda a corrente percorre os mesmos resistores em fila, logo as resistências se somam: Req = R1 + R2.',
      };
    }
  }

  // 4. Power formula traps (P = V/I or P = R*I instead of R*I^2)
  if (targetType === 'power' && voltage) {
    if (areValuesEqual(studentNum, voltage / expectedNum)) {
      return {
        type: 'conceptual',
        explanation: 'A potência elétrica mede a energia por segundo: P = V · I ou P = R · I² (ou P = V² / R). Dividir a tensão pela corrente resulta na resistência (Lei de Ohm), não na potência.',
      };
    }
  }

  // Default: calculation discrepancy or misinterpretation
  const diff = Math.abs(studentNum - expectedNum);
  if (diff < expectedNum * 0.4) {
    return {
      type: 'calculation',
      explanation: 'O raciocínio físico está no caminho certo, porém houve um desvio na operação aritmética final.',
    };
  }

  return {
    type: 'interpretation',
    explanation: 'A resposta difere da solução autoritativa. Verifique quais ramos do circuito estão ativos e se a grandeza correta foi calculada.',
  };
}

/**
 * Fisher-Yates shuffle for question options
 */
export function randomizeQuestionOptions<T>(options: T[]): T[] {
  const cloned = [...options];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

