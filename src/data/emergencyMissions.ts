import { EmergencyMission } from '../types';

export const EMERGENCY_MISSIONS: EmergencyMission[] = [
  // -------------------------------------------------------------
  // 1. LEI DE OHM - RECRUTA (CORRENTE)
  // -------------------------------------------------------------
  {
    id: 'em_01_gerador_principal',
    title: 'Emergência no Barramento do Gerador Principal',
    narrative: 'Um pico magnético desregulou o gerador de corrente contínua da eclusa alpha. O voltímetro de bordo marca 12 V estáveis alimentando um resistor de blindagem de 6 Ω. Para evitar que os relés desarmem, precisamos determinar imediatamente a corrente que atravessará o circuito.',
    subsystem: 'Eclusa Alpha • Gerador CC',
    difficulty: 'recruta',
    difficultyLabel: 'Nível Recruta • Lei de Ohm',
    timeLimit: 90,
    voltage: 12,
    circuit: {
      voltage: 12,
      resistors: [6],
      configuration: 'single',
      labels: ['Resistor de Blindagem (R1)'],
      meters: [{ type: 'voltmeter', value: 12, unit: 'V' }],
    },
    objective: {
      type: 'calculate_current',
      expectedValue: 2,
      tolerance: 0.1,
      promptText: 'Calcule a corrente elétrica (I) que percorre o resistor de blindagem:',
      unit: 'A',
      formulaUsed: 'I = V / R',
    },
    reward: {
      xp: 250,
      bonusXP: 100,
    },
    options: [
      { id: 'A', value: 0.5, label: '0,5 A', distractorReason: 'Dividiu R por V (6 / 12)' },
      { id: 'B', value: 2.0, label: '2,0 A', distractorReason: 'Correto: I = 12 V / 6 Ω = 2 A' },
      { id: 'C', value: 6.0, label: '6,0 A', distractorReason: 'Subtraiu 12 - 6' },
      { id: 'D', value: 72.0, label: '72,0 A', distractorReason: 'Multiplicou V * R (12 * 6)' },
      { id: 'E', value: 18.0, label: '18,0 A', distractorReason: 'Somou V + R (12 + 6)' },
    ],
    hints: [
      'Pela Primeira Lei de Ohm, a corrente elétrica é inversamente proporcional à resistência.',
      'Aplique a fórmula fundamental: I = V / R.',
      'Substitua os valores: I = 12 V / 6 Ω = 2 A.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Identificação dos Dados Fornecidos',
        description: 'O circuito é composto por uma fonte de tensão contínua e uma única carga resistiva.',
        formula: 'V = 12 V,  R = 6 Ω',
        highlight: ['V = 12 V', 'R = 6 Ω'],
      },
      {
        id: 's2',
        title: '2. Aplicação da Primeira Lei de Ohm',
        description: 'A diferença de potencial elétrico (V) se relaciona com a corrente (I) e a resistência (R). Isolamos a corrente elétrica.',
        formula: 'I = V / R',
        substitution: 'I = 12 V / 6 Ω',
        calculation: '12 / 6 = 2',
        result: 'I = 2,0 A',
      },
      {
        id: 's3',
        title: '3. Conclusão Operacional',
        description: 'O amperímetro registrará exatamente 2,0 Amperes. Com esse valor, a chave de desacoplamento térmico pode ser armada em segurança!',
        result: 'Alternativa correta: 2,0 A',
      },
    ],
  },

  // -------------------------------------------------------------
  // 2. LEI DE OHM - RECRUTA (TENSÃO)
  // -------------------------------------------------------------
  {
    id: 'em_02_sensores_pressao',
    title: 'Queda de Potencial nos Sensores de Pressão',
    narrative: 'Os sensores do módulo botânico indicam que uma corrente constante de 0,5 A precisa percorrer a bobina resistiva de 40 Ω para manter os dados telemétricos ativos. Qual deve ser a diferença de potencial elétrico (tensão) ajustada na fonte do painel de controle?',
    subsystem: 'Módulo Botânico • Sensores Barométricos',
    difficulty: 'recruta',
    difficultyLabel: 'Nível Recruta • Lei de Ohm',
    timeLimit: 90,
    voltage: 20,
    circuit: {
      voltage: 20,
      resistors: [40],
      configuration: 'single',
      labels: ['Bobina de Medição (R_sensor)'],
      meters: [{ type: 'ammeter', value: 0.5, unit: 'A' }],
    },
    objective: {
      type: 'calculate_voltage',
      expectedValue: 20,
      tolerance: 0.1,
      promptText: 'Determine a tensão necessária (V) para fornecer 0,5 A à bobina de 40 Ω:',
      unit: 'V',
      formulaUsed: 'V = R · I',
    },
    reward: {
      xp: 250,
      bonusXP: 100,
    },
    options: [
      { id: 'A', value: 80.0, label: '80 V', distractorReason: 'Dividiu R por I (40 / 0,5)' },
      { id: 'B', value: 20.0, label: '20 V', distractorReason: 'Correto: V = 40 Ω * 0,5 A = 20 V' },
      { id: 'C', value: 0.0125, label: '0,0125 V', distractorReason: 'Dividiu I por R (0,5 / 40)' },
      { id: 'D', value: 39.5, label: '39,5 V', distractorReason: 'Subtraiu R - I' },
      { id: 'E', value: 40.5, label: '40,5 V', distractorReason: 'Somou R + I' },
    ],
    hints: [
      'A tensão V é o produto da resistência pela corrente que a atravessa.',
      'Fórmula: V = R · I.',
      'Cálculo: V = 40 · 0,5 = 20 V.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Coleta dos Parâmetros',
        description: 'Temos a resistência ôhmica do sensor e a corrente operacional requerida.',
        formula: 'R = 40 Ω,  I = 0,5 A',
      },
      {
        id: 's2',
        title: '2. Equação da Lei de Ohm para Tensão',
        description: 'Multiplicamos a resistência ôhmica pela intensidade da corrente elétrica.',
        formula: 'V = R · I',
        substitution: 'V = 40 Ω · 0,5 A',
        calculation: '40 · 0,5 = 20',
        result: 'V = 20 V',
      },
      {
        id: 's3',
        title: '3. Ajuste do Gerador',
        description: 'Regulando a fonte para 20 V, a corrente de 0,5 A flui sem riscos de subalimentação ou queima.',
        result: 'Alternativa correta: 20 V',
      },
    ],
  },

  // -------------------------------------------------------------
  // 3. LEI DE OHM - RECRUTA (RESISTÊNCIA)
  // -------------------------------------------------------------
  {
    id: 'em_03_painel_solar_beta',
    title: 'Diagnóstico de Resistência no Painel Solar Beta',
    narrative: 'O conversor fotovoltaico do Painel Solar Beta está fornecendo 24 V de tensão sob uma corrente medida de 3 A para alimentar os aquecedores de células. Determine a resistência equivalente desse módulo para calibrar a chave de proteção térmica.',
    subsystem: 'Painel Fotovoltaico Beta',
    difficulty: 'recruta',
    difficultyLabel: 'Nível Recruta • Resistência Ôhmica',
    timeLimit: 90,
    voltage: 24,
    circuit: {
      voltage: 24,
      resistors: [8],
      configuration: 'single',
      labels: ['Módulo Aquecedor (R_beta)'],
    },
    objective: {
      type: 'calculate_resistance',
      expectedValue: 8,
      tolerance: 0.1,
      promptText: 'Calcule a resistência ôhmica (R) do módulo do painel:',
      unit: 'Ω',
      formulaUsed: 'R = V / I',
    },
    reward: {
      xp: 250,
      bonusXP: 100,
    },
    options: [
      { id: 'A', value: 8.0, label: '8 Ω', distractorReason: 'Correto: R = 24 / 3 = 8 Ω' },
      { id: 'B', value: 72.0, label: '72 Ω', distractorReason: 'Multiplicou V * I (24 * 3)' },
      { id: 'C', value: 0.125, label: '0,125 Ω', distractorReason: 'Inverteu I / V (3 / 24)' },
      { id: 'D', value: 21.0, label: '21 Ω', distractorReason: 'Subtraiu 24 - 3' },
      { id: 'E', value: 27.0, label: '27 Ω', distractorReason: 'Somou 24 + 3' },
    ],
    hints: [
      'Isole a resistência na Lei de Ohm: R = V / I.',
      'A razão entre 24 Volts e 3 Amperes fornecerá o valor em Ohms.',
      'R = 24 / 3 = 8 Ω.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Parâmetros da Linha Solar',
        description: 'Tensão nominal medida na saída do painel e corrente consumida pelo circuito de aquecimento.',
        formula: 'V = 24 V,  I = 3 A',
      },
      {
        id: 's2',
        title: '2. Dedução da Resistência',
        description: 'Pela Lei de Ohm, a resistência é o quociente entre o potencial elétrico e a corrente.',
        formula: 'R = V / I',
        substitution: 'R = 24 V / 3 A',
        calculation: '24 / 3 = 8',
        result: 'R = 8 Ω',
      },
      {
        id: 's3',
        title: '3. Calibração',
        description: 'Ajuste a chave limitadora para 8 Ω para manter o painel sob proteção estrita contra surtos.',
        result: 'Alternativa correta: 8 Ω',
      },
    ],
  },

  // -------------------------------------------------------------
  // 4. ASSOCIAÇÃO EM SÉRIE - ENGENHEIRO
  // -------------------------------------------------------------
  {
    id: 'em_04_paineis_aquecimento_serie',
    title: 'Sobrecarga nos Painéis de Aquecimento em Série',
    narrative: 'A tubulação externa de refrigerante está prestes a congelar. Para aquecê-la, dois resistores cerâmicos estão ligados em SÉRIE: R1 = 4 Ω e R2 = 8 Ω, sob uma linha de alimentação de 24 V. Descubra a resistência equivalente (Req) e a corrente que flui por todo o conjunto!',
    subsystem: 'Controle Térmico Criogênico',
    difficulty: 'engenheiro',
    difficultyLabel: 'Nível Engenheiro • Associação em Série',
    timeLimit: 75,
    voltage: 24,
    circuit: {
      voltage: 24,
      resistors: [4, 8],
      configuration: 'series',
      labels: ['Resistor Térmico R1 (4 Ω)', 'Resistor Térmico R2 (8 Ω)'],
    },
    objective: {
      type: 'equivalent_resistance',
      expectedValue: 12,
      tolerance: 0.1,
      promptText: 'Qual é a Resistência Equivalente (Req) dos resistores associados em série?',
      unit: 'Ω',
      formulaUsed: 'Req = R1 + R2',
    },
    reward: {
      xp: 350,
      bonusXP: 120,
    },
    options: [
      { id: 'A', value: 2.67, label: '2,67 Ω', distractorReason: 'Calculou como se estivessem em paralelo: (4*8)/(4+8)' },
      { id: 'B', value: 12.0, label: '12 Ω', distractorReason: 'Correto: Req = 4 + 8 = 12 Ω' },
      { id: 'C', value: 32.0, label: '32 Ω', distractorReason: 'Multiplicou R1 * R2' },
      { id: 'D', value: 4.0, label: '4 Ω', distractorReason: 'Subtraiu 8 - 4' },
      { id: 'E', value: 2.0, label: '2 Ω', distractorReason: 'Dividiu 8 / 4' },
    ],
    hints: [
      'Em circuitos em série, os resistores estão no mesmo fio: a mesma corrente passa por ambos.',
      'A resistência equivalente em série é a soma direta das resistências.',
      'Req = R1 + R2 = 4 + 8 = 12 Ω.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Reconhecimento da Topologia em Série',
        description: 'Os resistores R1 e R2 estão conectados sequencialmente, sem bifurcações ou nós intermediários. A corrente elétrica que atravessa R1 é obrigatoriamente a mesma que atravessa R2.',
        formula: 'I_total = I_1 = I_2',
      },
      {
        id: 's2',
        title: '2. Cálculo da Resistência Equivalente (Req)',
        description: 'Para resistores em série, somamos diretamente suas resistências ôhmicas.',
        formula: 'Req = R1 + R2',
        substitution: 'Req = 4 Ω + 8 Ω',
        calculation: '4 + 8 = 12',
        result: 'Req = 12 Ω',
      },
      {
        id: 's3',
        title: '3. Verificação da Corrente Total',
        description: 'Com Req = 12 Ω e V = 24 V, a corrente total no circuito vale: I = 24 V / 12 Ω = 2 A. Cada resistor gera queda de potencial: V1 = 4·2 = 8 V e V2 = 8·2 = 16 V (8V + 16V = 24V).',
        result: 'Alternativa correta: 12 Ω',
      },
    ],
  },

  // -------------------------------------------------------------
  // 5. ASSOCIAÇÃO EM SÉRIE - 3 RESISTORES
  // -------------------------------------------------------------
  {
    id: 'em_05_tripla_serie_suporte_vida',
    title: 'Desbalanço na Tripla Série do Suporte de Vida',
    narrative: 'Três bombas de recirculação de oxigênio estão acopladas em série na grade secundária: R1 = 10 Ω, R2 = 15 Ω e R3 = 25 Ω. A linha opera em 100 V. Calcule a corrente elétrica (I) que flui pelas três bombas.',
    subsystem: 'Suporte de Vida • Grade de Recirculação',
    difficulty: 'engenheiro',
    difficultyLabel: 'Nível Engenheiro • Série Tripla',
    timeLimit: 75,
    voltage: 100,
    circuit: {
      voltage: 100,
      resistors: [10, 15, 25],
      configuration: 'series',
      labels: ['Bomba O2 Primária (10 Ω)', 'Bomba O2 Secundária (15 Ω)', 'Bomba O2 Filtro (25 Ω)'],
    },
    objective: {
      type: 'calculate_current',
      expectedValue: 2,
      tolerance: 0.1,
      promptText: 'Calcule a intensidade da corrente (I) que circula pela associação em série:',
      unit: 'A',
      formulaUsed: 'I = V / Req,  onde Req = R1 + R2 + R3',
    },
    reward: {
      xp: 380,
      bonusXP: 140,
    },
    options: [
      { id: 'A', value: 2.0, label: '2,0 A', distractorReason: 'Correto: Req = 10+15+25 = 50 Ω; I = 100 / 50 = 2 A' },
      { id: 'B', value: 0.5, label: '0,5 A', distractorReason: 'Dividiu 50 / 100 em vez de 100 / 50' },
      { id: 'C', value: 5.0, label: '5,0 A', distractorReason: 'Calculou com apenas R = 20' },
      { id: 'D', value: 10.0, label: '10,0 A', distractorReason: 'Usou apenas o resistor R1 (100 / 10)' },
      { id: 'E', value: 50.0, label: '50,0 A', distractorReason: 'Confundiu a resistência equivalente com a corrente' },
    ],
    hints: [
      'Primeiro some todos os resistores para achar a Req: Req = 10 + 15 + 25 = 50 Ω.',
      'Depois aplique a Lei de Ohm com a tensão total: I = V / Req.',
      'I = 100 V / 50 Ω = 2 A.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Soma das Resistências em Série',
        description: 'Três resistores no mesmo ramo compartilham a mesma corrente total.',
        formula: 'Req = R1 + R2 + R3',
        substitution: 'Req = 10 Ω + 15 Ω + 25 Ω',
        calculation: '10 + 15 + 25 = 50',
        result: 'Req = 50 Ω',
      },
      {
        id: 's2',
        title: '2. Aplicação da Lei de Ohm no Circuito Global',
        description: 'Usamos a tensão da linha de 100 V e a resistência equivalente calculada.',
        formula: 'I = V / Req',
        substitution: 'I = 100 V / 50 Ω',
        calculation: '100 / 50 = 2',
        result: 'I = 2,0 A',
      },
      {
        id: 's3',
        title: '3. Análise Final',
        description: 'Exatamente 2,0 A percorrem cada uma das três bombas de oxigênio sem interrupção.',
        result: 'Alternativa correta: 2,0 A',
      },
    ],
  },

  // -------------------------------------------------------------
  // 6. ASSOCIAÇÃO EM PARALELO - ENGENHEIRO
  // -------------------------------------------------------------
  {
    id: 'em_06_eclusa_descompressao_paralelo',
    title: 'Queda de Pressão na Eclusa de Descompressão',
    narrative: 'As duas válvulas de alívio rápido da eclusa estão conectadas em PARALELO para garantir redundância: R1 = 6 Ω e R2 = 3 Ω. A linha principal fornece 18 V. Para balancear os disjuntores, Tigrão precisa da Resistência Equivalente (Req) dessa associação em paralelo.',
    subsystem: 'Eclusa Principal • Válvulas Pneumáticas',
    difficulty: 'engenheiro',
    difficultyLabel: 'Nível Engenheiro • Associação em Paralelo',
    timeLimit: 75,
    voltage: 18,
    circuit: {
      voltage: 18,
      resistors: [6, 3],
      configuration: 'parallel',
      labels: ['Válvula Solenoide 1 (6 Ω)', 'Válvula Solenoide 2 (3 Ω)'],
    },
    objective: {
      type: 'equivalent_resistance',
      expectedValue: 2,
      tolerance: 0.1,
      promptText: 'Calcule a Resistência Equivalente (Req) dos resistores de 6 Ω e 3 Ω em paralelo:',
      unit: 'Ω',
      formulaUsed: 'Req = (R1 · R2) / (R1 + R2)',
    },
    reward: {
      xp: 380,
      bonusXP: 130,
    },
    options: [
      { id: 'A', value: 9.0, label: '9 Ω', distractorReason: 'Somou como se fosse em série (6 + 3)' },
      { id: 'B', value: 2.0, label: '2 Ω', distractorReason: 'Correto: (6 * 3) / (6 + 3) = 18 / 9 = 2 Ω' },
      { id: 'C', value: 4.5, label: '4,5 Ω', distractorReason: 'Média aritmética simples ((6+3)/2)' },
      { id: 'D', value: 18.0, label: '18 Ω', distractorReason: 'Apenas multiplicou 6 * 3' },
      { id: 'E', value: 0.5, label: '0,5 Ω', distractorReason: 'Inverteu a fração' },
    ],
    hints: [
      'Em paralelo, a Req é sempre MENOR do que a menor resistência individual (menor que 3 Ω).',
      'Use a regra do produto pela soma para dois resistores: Req = (R1 · R2) / (R1 + R2).',
      'Req = (6 · 3) / (6 + 3) = 18 / 9 = 2 Ω.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Propriedade do Circuito em Paralelo',
        description: 'Ambos os resistores estão ligados aos mesmos nós (A e B), suportando rigorosamente a mesma d.d.p. de 18 V.',
        formula: 'V_total = V1 = V2 = 18 V',
      },
      {
        id: 's2',
        title: '2. Regra do Produto pela Soma',
        description: 'Para dois resistores em paralelo, calculamos a razão entre a multiplicação e a adição de suas grandezas.',
        formula: 'Req = (R1 · R2) / (R1 + R2)',
        substitution: 'Req = (6 · 3) / (6 + 3) = 18 / 9',
        calculation: '18 / 9 = 2',
        result: 'Req = 2 Ω',
      },
      {
        id: 's3',
        title: '3. Correntes nos Ramos',
        description: 'No ramo de 6 Ω flui I1 = 18/6 = 3 A. No ramo de 3 Ω flui I2 = 18/3 = 6 A. A corrente total fornecida pela fonte é 3 + 6 = 9 A (e conferindo: 18 V / 2 Ω = 9 A).',
        result: 'Alternativa correta: 2 Ω',
      },
    ],
  },

  // -------------------------------------------------------------
  // 7. ASSOCIAÇÃO EM PARALELO - RESISTORES IGUAIS
  // -------------------------------------------------------------
  {
    id: 'em_07_iluminacao_emergencia_iguais',
    title: 'Divisor de Carga na Iluminação de Emergência',
    narrative: 'O corredor de fuga está operando com duas luminárias LED de alta potência em paralelo, cada uma oferecendo resistência de 20 Ω, conectadas a uma linha de 24 V. Determine a corrente total drenada da bateria de emergência para alimentar os dois módulos.',
    subsystem: 'Corredores de Fuga • Iluminação LED',
    difficulty: 'engenheiro',
    difficultyLabel: 'Nível Engenheiro • Paralelo Idêntico',
    timeLimit: 75,
    voltage: 24,
    circuit: {
      voltage: 24,
      resistors: [20, 20],
      configuration: 'parallel',
      labels: ['Módulo LED 1 (20 Ω)', 'Módulo LED 2 (20 Ω)'],
    },
    objective: {
      type: 'calculate_current',
      expectedValue: 2.4,
      tolerance: 0.1,
      promptText: 'Calcule a corrente elétrica total (I_total) que sai da fonte de 24 V:',
      unit: 'A',
      formulaUsed: 'Req = R / N = 20 / 2 = 10 Ω; I = V / Req',
    },
    reward: {
      xp: 400,
      bonusXP: 150,
    },
    options: [
      { id: 'A', value: 0.6, label: '0,6 A', distractorReason: 'Calculou como se estivessem em série (Req = 40 Ω -> 24/40)' },
      { id: 'B', value: 1.2, label: '1,2 A', distractorReason: 'Calculou a corrente de apenas um ramo (24 / 20)' },
      { id: 'C', value: 2.4, label: '2,4 A', distractorReason: 'Correto: Req = 10 Ω; I = 24 / 10 = 2,4 A' },
      { id: 'D', value: 4.8, label: '4,8 A', distractorReason: 'Multiplicou a corrente incorretamente' },
      { id: 'E', value: 10.0, label: '10,0 A', distractorReason: 'Confundiu a resistência equivalente com a corrente' },
    ],
    hints: [
      'Quando resistores idênticos estão em paralelo, a Req é o valor de um dividido pela quantidade: Req = R / 2.',
      'Aqui Req = 20 / 2 = 10 Ω.',
      'Pela Lei de Ohm: I_total = 24 V / 10 Ω = 2,4 A.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Resistência Equivalente de Cargas Iguais',
        description: 'Para n resistores iguais a R em paralelo, a resistência divide-se pelo número de ramos n.',
        formula: 'Req = R / n',
        substitution: 'Req = 20 Ω / 2',
        calculation: '20 / 2 = 10',
        result: 'Req = 10 Ω',
      },
      {
        id: 's2',
        title: '2. Corrente Elétrica Total',
        description: 'Aplicamos a Primeira Lei de Ohm à tensão de alimentação de 24 V.',
        formula: 'I_total = V / Req',
        substitution: 'I_total = 24 V / 10 Ω',
        calculation: '24 / 10 = 2,4',
        result: 'I_total = 2,4 A',
      },
      {
        id: 's3',
        title: '3. Conferência por Nós (Lei dos Nós de Kirchhoff)',
        description: 'Cada ramo consome 24/20 = 1,2 A. Pela conservação da carga, a corrente total é 1,2 A + 1,2 A = 2,4 A.',
        result: 'Alternativa correta: 2,4 A',
      },
    ],
  },

  // -------------------------------------------------------------
  // 8. POTÊNCIA ELÉTRICA - ESPECIALISTA
  // -------------------------------------------------------------
  {
    id: 'em_08_superaquecimento_propulsores',
    title: 'Superaquecimento nos Propulsores de Manobra',
    narrative: 'Os bicos injetores do propulsor giroscópico estão trabalhando sob 120 V e drenando 5 A. O sistema de telemetria precisa aferir a Potência Elétrica dissipada em Watts para acionar o sistema de dissipação a nitrogênio líquido.',
    subsystem: 'Propulsores de Manobra • Eixo Yaw',
    difficulty: 'especialista',
    difficultyLabel: 'Nível Especialista • Potência Elétrica',
    timeLimit: 60,
    voltage: 120,
    circuit: {
      voltage: 120,
      resistors: [24],
      configuration: 'single',
      labels: ['Injetor do Propulsor (24 Ω)'],
      meters: [
        { type: 'voltmeter', value: 120, unit: 'V' },
        { type: 'ammeter', value: 5, unit: 'A' },
      ],
    },
    objective: {
      type: 'calculate_power',
      expectedValue: 600,
      tolerance: 5,
      promptText: 'Calcule a Potência Elétrica (P) consumida pelo sistema de propulsão:',
      unit: 'W',
      formulaUsed: 'P = V · I',
    },
    reward: {
      xp: 450,
      bonusXP: 180,
    },
    options: [
      { id: 'A', value: 24.0, label: '24 W', distractorReason: 'Dividiu V / I (120 / 5 = resistência)' },
      { id: 'B', value: 600.0, label: '600 W', distractorReason: 'Correto: P = 120 V * 5 A = 600 W' },
      { id: 'C', value: 125.0, label: '125 W', distractorReason: 'Somou V + I (120 + 5)' },
      { id: 'D', value: 3000.0, label: '3000 W', distractorReason: 'Multiplicou V * V / 5 erroneamente' },
      { id: 'E', value: 0.0416, label: '0,042 W', distractorReason: 'Dividiu I / V' },
    ],
    hints: [
      'A potência elétrica é a taxa com que a energia elétrica é transformada por unidade de tempo.',
      'Fórmula: P = V · I.',
      'Cálculo: P = 120 V · 5 A = 600 W (Watts).',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Grandezas de Potência',
        description: 'Tensão fornecida pelo barramento de alta corrente e intensidade de corrente medida.',
        formula: 'V = 120 V,  I = 5 A',
      },
      {
        id: 's2',
        title: '2. Aplicação da Equação da Potência',
        description: 'A potência é o produto direto da diferença de potencial elétrico pela intensidade da corrente.',
        formula: 'P = V · I',
        substitution: 'P = 120 V · 5 A',
        calculation: '120 · 5 = 600',
        result: 'P = 600 W (ou 0,6 kW)',
      },
      {
        id: 's3',
        title: '3. Dimensionamento Térmico',
        description: 'Dissipando 600 Joules por segundo em calor e trabalho cinético, o fluxo de nitrogênio deve ser mantido em nível 3.',
        result: 'Alternativa correta: 600 W',
      },
    ],
  },

  // -------------------------------------------------------------
  // 9. POTÊNCIA ELÉTRICA COM RESISTÊNCIA (P = R·I²) - ESPECIALISTA
  // -------------------------------------------------------------
  {
    id: 'em_09_computador_bordo_efeito_joule',
    title: 'Dissipação Térmica no Computador de Bordo',
    narrative: 'O processador quântico de navegação dissipa calor através de um resistor interno de 10 Ω por onde circula uma corrente de 4 A. Calcule a potência dissipada por Efeito Joule (P = R · I²) para evitar colapso do núcleo.',
    subsystem: 'Computador Central de Navegação',
    difficulty: 'especialista',
    difficultyLabel: 'Nível Especialista • Efeito Joule',
    timeLimit: 60,
    voltage: 40,
    circuit: {
      voltage: 40,
      resistors: [10],
      configuration: 'single',
      labels: ['Resistor de Dissipação Quântica (10 Ω)'],
      meters: [{ type: 'ammeter', value: 4, unit: 'A' }],
    },
    objective: {
      type: 'calculate_power',
      expectedValue: 160,
      tolerance: 2,
      promptText: 'Determine a potência dissipada (P) pelo resistor de 10 Ω com 4 A de corrente:',
      unit: 'W',
      formulaUsed: 'P = R · I²',
    },
    reward: {
      xp: 450,
      bonusXP: 200,
    },
    options: [
      { id: 'A', value: 40.0, label: '40 W', distractorReason: 'Esqueceu de elevar a corrente ao quadrado: R * I = 10 * 4 = 40 (que é a tensão!)' },
      { id: 'B', value: 160.0, label: '160 W', distractorReason: 'Correto: P = 10 * 4² = 10 * 16 = 160 W' },
      { id: 'C', value: 80.0, label: '80 W', distractorReason: 'Multiplicou por 2 em vez de elevar ao quadrado: 10 * 8 = 80' },
      { id: 'D', value: 1600.0, label: '1600 W', distractorReason: 'Elevou a resistência ao quadrado' },
      { id: 'E', value: 2.5, label: '2,5 W', distractorReason: 'Dividiu R por I' },
    ],
    hints: [
      'Atenção à fórmula do Efeito Joule: P = R · I² (a corrente deve ser elevada ao quadrado).',
      'Primeiro eleve a corrente: 4² = 16.',
      'Depois multiplique pela resistência: P = 10 · 16 = 160 W.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Análise da Fórmula de Joule',
        description: 'Quando conhecemos a resistência e a corrente, a fórmula mais direta para a potência dissipada em calor é P = R · I².',
        formula: 'P = R · I²',
      },
      {
        id: 's2',
        title: '2. Resolução Matemática',
        description: 'Primeiro calculamos o expoente da corrente elétrica e em seguida multiplicamos pela resistência ôhmica.',
        formula: 'P = 10 · (4)²',
        substitution: 'P = 10 · 16',
        calculation: '10 · 16 = 160',
        result: 'P = 160 W',
      },
      {
        id: 's3',
        title: '3. Diagnóstico',
        description: 'Notou que se você apenas multiplicasse 10 · 4 encontraria 40 Volts (a tensão)? A potência requer a corrente ao quadrado!',
        result: 'Alternativa correta: 160 W',
      },
    ],
  },

  // -------------------------------------------------------------
  // 10. CIRCUITO MISTO - COMANDANTE
  // -------------------------------------------------------------
  {
    id: 'em_10_nucleo_distribuicao_misto',
    title: 'Falha Geral no Núcleo de Distribuição Misto',
    narrative: 'Alerta vermelho! O nó central da estação apresenta um circuito MISTO: um resistor R1 = 5 Ω em série com um bloco paralelo formado por R2 = 6 Ω e R3 = 3 Ω. A linha é alimentada por 28 V. Para evitar um desligamento forçado de todos os subsistemas, determine a Resistência Equivalente Total (Req).',
    subsystem: 'Núcleo Central de Distribuição de Energia',
    difficulty: 'comandante',
    difficultyLabel: 'Nível Comandante • Circuito Misto',
    timeLimit: 60,
    voltage: 28,
    circuit: {
      voltage: 28,
      resistors: [5, 6, 3],
      configuration: 'mixed',
      labels: ['R1 em Série (5 Ω)', 'R2 em Paralelo Superior (6 Ω)', 'R3 em Paralelo Inferior (3 Ω)'],
    },
    objective: {
      type: 'equivalent_resistance',
      expectedValue: 7,
      tolerance: 0.1,
      promptText: 'Calcule a Resistência Equivalente Total (Req) do circuito misto:',
      unit: 'Ω',
      formulaUsed: 'Req = R1 + (R2 · R3)/(R2 + R3) = 5 + 2 = 7 Ω',
    },
    reward: {
      xp: 500,
      bonusXP: 250,
    },
    options: [
      { id: 'A', value: 14.0, label: '14 Ω', distractorReason: 'Somou todos os resistores diretamente (5 + 6 + 3)' },
      { id: 'B', value: 7.0, label: '7 Ω', distractorReason: 'Correto: R_paralelo = (6*3)/(6+3) = 2 Ω; Req = 5 + 2 = 7 Ω' },
      { id: 'C', value: 1.43, label: '1,43 Ω', distractorReason: 'Calculou todos os três como se estivessem em paralelo' },
      { id: 'D', value: 9.5, label: '9,5 Ω', distractorReason: 'Erro de frações no cálculo do paralelo' },
      { id: 'E', value: 4.0, label: '4 Ω', distractorReason: 'Subtraiu os blocos' },
    ],
    hints: [
      'Resolva em duas etapas: primeiro o bloco paralelo (R2 e R3), depois some com o resistor em série (R1).',
      'Para R2 e R3 em paralelo: R_p = (6 · 3) / (6 + 3) = 18 / 9 = 2 Ω.',
      'Agora some com R1 em série: Req = 5 + 2 = 7 Ω.',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Decomposição do Circuito Misto em Etapas',
        description: 'Identificamos que R2 (6 Ω) e R3 (3 Ω) estão em paralelo entre si. O conjunto paralelo resultante fica em série com R1 (5 Ω).',
        formula: 'Req = R1 + R_paralelo',
      },
      {
        id: 's2',
        title: '2. Cálculo do Bloco Paralelo (R2 // R3)',
        description: 'Usamos a fórmula do produto pela soma para os ramos de 6 Ω e 3 Ω.',
        formula: 'R_p = (R2 · R3) / (R2 + R3)',
        substitution: 'R_p = (6 · 3) / (6 + 3) = 18 / 9',
        calculation: '18 / 9 = 2',
        result: 'R_p = 2 Ω',
      },
      {
        id: 's3',
        title: '3. Associação em Série Final',
        description: 'Substituímos o bloco paralelo pelo seu resistor equivalente de 2 Ω e somamos com o resistor de entrada R1.',
        formula: 'Req = R1 + R_p',
        substitution: 'Req = 5 Ω + 2 Ω',
        calculation: '5 + 2 = 7',
        result: 'Req = 7 Ω',
      },
      {
        id: 's4',
        title: '4. Corrente Geral da Estação',
        description: 'Com V = 28 V e Req = 7 Ω, a corrente total no tronco principal é I = 28 / 7 = 4 A! A estação foi completamente salva!',
        result: 'Alternativa correta: 7 Ω',
      },
    ],
  },

  // -------------------------------------------------------------
  // 11. DESAFIO ENEM - DISJUNTOR DA ESTAÇÃO ESPACIAL
  // -------------------------------------------------------------
  {
    id: 'em_11_desafio_enem_disjuntor',
    title: 'Desafio ENEM: Dimensionamento do Disjuntor Geral',
    narrative: 'Um disjuntor é um dispositivo de proteção eletromecânico que interrompe a passagem de corrente quando esta ultrapassa um valor de segurança. Na Estação Orbital, a rede geral de 120 V possui um disjuntor de 15 A. Estão ligados simultaneamente um aquecedor de 1200 W e um purificador de ar de 360 W. Qual a corrente elétrica total consumida pelos aparelhos e o disjuntor irá desarmar?',
    subsystem: 'Painel Central de Disjuntores • Norma ENEM',
    difficulty: 'enem',
    difficultyLabel: 'Desafio ENEM • Circuitos Residenciais / Orbitais',
    timeLimit: 90,
    voltage: 120,
    circuit: {
      voltage: 120,
      resistors: [12, 40],
      configuration: 'parallel',
      labels: ['Aquecedor (1200 W)', 'Purificador de Ar (360 W)'],
      meters: [{ type: 'ammeter', value: 13, unit: 'A' }],
    },
    objective: {
      type: 'calculate_current',
      expectedValue: 13,
      tolerance: 0.5,
      promptText: 'Calcule a corrente elétrica total consumida (I_total) na linha de 120 V:',
      unit: 'A',
      formulaUsed: 'I = P_total / V = (1200 + 360) / 120 = 1560 / 120 = 13 A',
    },
    reward: {
      xp: 600,
      bonusXP: 300,
    },
    options: [
      { id: 'A', value: 13.0, label: '13 A (O disjuntor NÃO desarma, pois 13 A < 15 A)', distractorReason: 'Correto: P_total = 1560 W; I = 1560 / 120 = 13 A < 15 A' },
      { id: 'B', value: 16.0, label: '16 A (O disjuntor DESARMA, pois 16 A > 15 A)', distractorReason: 'Erro aritmético na soma das correntes' },
      { id: 'C', value: 10.0, label: '10 A (Considerou apenas a corrente do aquecedor)', distractorReason: 'Calculou apenas I1 = 1200/120 = 10 A' },
      { id: 'D', value: 3.0, label: '3 A (Considerou apenas o purificador de ar)', distractorReason: 'Calculou apenas I2 = 360/120 = 3 A' },
      { id: 'E', value: 25.0, label: '25 A (Multiplicou potências incorretamente)', distractorReason: 'Erro de conversão' },
    ],
    hints: [
      'Em circuitos em paralelo residenciais ou orbitais sob a mesma tensão, a potência total é a soma das potências: P_total = P1 + P2.',
      'Use I_total = P_total / V.',
      'Compare a corrente obtida com os 15 A do disjuntor: se I <= 15 A, não desarma!',
    ],
    solutionSteps: [
      {
        id: 's1',
        title: '1. Soma das Potências dos Aparelhos em Paralelo',
        description: 'Como todos os equipamentos funcionam de forma independente sob a mesma d.d.p. de 120 V, a potência total solicitada à rede elétrica é a soma de suas potências nominais.',
        formula: 'P_total = P_aquecedor + P_purificador',
        substitution: 'P_total = 1200 W + 360 W',
        calculation: '1200 + 360 = 1560',
        result: 'P_total = 1560 W',
      },
      {
        id: 's2',
        title: '2. Cálculo da Corrente Total da Linha',
        description: 'Pela relação entre potência, tensão e corrente (P = V · I):',
        formula: 'I_total = P_total / V',
        substitution: 'I_total = 1560 W / 120 V',
        calculation: '1560 / 120 = 13',
        result: 'I_total = 13 A',
      },
      {
        id: 's3',
        title: '3. Avaliação do Disjuntor de Proteção',
        description: 'A corrente que passará pelo disjuntor geral é de 13 A. Como o disjuntor está calibrado para suportar até 15 A sem desarmar, e 13 A < 15 A, o circuito funcionará perfeitamente sem interrupção!',
        result: 'Alternativa correta: 13 A (O disjuntor NÃO desarma)',
      },
    ],
  },
];
