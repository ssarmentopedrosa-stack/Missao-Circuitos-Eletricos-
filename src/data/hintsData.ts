import { TieredHints } from '../types';

export const QUESTION_TIERED_HINTS: Record<string, TieredHints> = {
  // Setor 1: Cargas e Corrente
  's1-q1': {
    concept: 'Lembre-se da conservação da carga elétrica: a carga elementar é a menor porção de carga existente na natureza.',
    formula: 'Utilize a quantização da carga: Q = n · e, onde e = 1,6 × 10⁻¹⁹ C.',
    calculation: 'Isole o número de elétrons (n): n = Q / e. Substitua a carga acumulada e a carga elementar com atenção aos expoentes de base 10.',
  },
  's1-q2': {
    concept: 'A corrente elétrica contínua mede a quantidade de carga que atravessa a seção reta de um condutor por unidade de tempo.',
    formula: 'A definição fundamental de intensidade de corrente é: I = ΔQ / Δt (1 A = 1 C/s).',
    calculation: 'Substitua ΔQ e o intervalo de tempo Δt em segundos. Se o tempo estiver em minutos ou horas, faça a conversão prévia.',
  },
  's1-q3': {
    concept: 'O número de elétrons em movimento está diretamente relacionado à corrente total e ao intervalo de tempo decorrido.',
    formula: 'Combine Q = I · Δt com Q = n · e, obtendo: n = (I · Δt) / e.',
    calculation: 'Multiplique a corrente pelo tempo em segundos e divida pela constante elementar e = 1,6 × 10⁻¹⁹ C.',
  },

  // Setor 2: DDP e Geradores
  's2-q1': {
    concept: 'A diferença de potencial (tensão) mede a energia transferida a cada unidade de carga que passa pelo gerador.',
    formula: 'A relação é: V = E_el / Q (onde 1 Volt = 1 Joule por Coulomb).',
    calculation: 'Divida a energia total em Joules pela quantidade de carga em Coulombs.',
  },
  's2-q2': {
    concept: 'Em um gerador real, parte da força eletromotriz interna é perdida devido à resistência interna do próprio equipamento.',
    formula: 'Equação do gerador real: U = ε - r · I.',
    calculation: 'Multiplique a resistência interna pela corrente para achar a queda interna (r·I), e subtraia esse valor da f.e.m. ε.',
  },

  // Setor 3: Resistência e Lei de Ohm
  's3-q1': {
    concept: 'Para condutores ôhmicos a temperatura constante, a corrente é diretamente proporcional à ddp aplicada.',
    formula: 'Primeira Lei de Ohm: V = R · I.',
    calculation: 'Isole a grandeza pedida. Para achar I, faça I = V / R; para achar R, faça R = V / I.',
  },
  's3-q2': {
    concept: 'A resistência geométrica de um fio depende do material (resistividade), comprimento e espessura.',
    formula: 'Segunda Lei de Ohm: R = ρ · (L / A).',
    calculation: 'Fios mais compridos aumentam a resistência; fios mais grossos (maior área A) diminuem a resistência na mesma proporção.',
  },

  // Setor 4: Associação de Resistores em Série
  's4-q1': {
    concept: 'Em uma ligação em série, todos os resistores são percorridos pela MESMA corrente elétrica.',
    formula: 'Resistência equivalente em série: R_eq = R₁ + R₂ + R₃ + ... e V_total = V₁ + V₂ + ...',
    calculation: 'Some as resistências para obter R_eq. Em seguida, aplique I = V_total / R_eq para encontrar a corrente do ramo.',
  },
  's4-q2': {
    concept: 'A tensão se divide entre os resistores em série proporcionalmente às suas resistências.',
    formula: 'V_k = R_k · I (divisor de tensão).',
    calculation: 'Calcule a corrente comum e depois multiplique pelo resistor específico desejado.',
  },

  // Setor 5: Associação de Resistores em Paralelo
  's5-q1': {
    concept: 'Em ligação em paralelo, todos os ramos estão submetidos à MESMA diferença de potencial (tensão).',
    formula: '1 / R_eq = 1 / R₁ + 1 / R₂ ou, para dois resistores: R_eq = (R₁ · R₂) / (R₁ + R₂).',
    calculation: 'A resistência equivalente em paralelo é sempre menor que o menor dos resistores individuais.',
  },
  's5-q2': {
    concept: 'A corrente total da fonte se divide nos nós entre os ramos paralelos.',
    formula: 'Lei dos Nós de Kirchhoff: I_total = I₁ + I₂ + ... onde I_k = V / R_k.',
    calculation: 'Calcule a corrente de cada ramo dividindo a tensão pelo resistor daquele ramo, depois some para obter a corrente total.',
  },

  // Setor 6: Circuitos Mistos
  's6-q1': {
    concept: 'Identifique os blocos isolados que estão estritamente em série ou em paralelo e simplifique de dentro para fora.',
    formula: 'Primeiro calcule o bloco paralelo R_p = (R_a · R_b)/(R_a + R_b), depois some em série com o restante.',
    calculation: 'Substitua os valores dos resistores no bloco menor antes de ligá-lo com a fonte principal.',
  },

  // Setor 7: Potência Elétrica e Efeito Joule
  's7-q1': {
    concept: 'A potência mede a rapidez com que a energia elétrica é convertida em luz, calor ou movimento.',
    formula: 'P = V · I = R · I² = V² / R.',
    calculation: 'Escolha a fórmula conforme as grandezas que você tem. Se conhece V e R, use diretamente P = V² / R.',
  },
  's7-q2': {
    concept: 'O calor gerado por efeito Joule em condutores é proporcional à resistência e ao quadrado da corrente.',
    formula: 'Efeito Joule: Potência dissipada P_diss = R · I².',
    calculation: 'Eleve a corrente ao quadrado antes de multiplicar pela resistência.',
  },

  // Setor 8: Energia Elétrica e Consumo
  's8-q1': {
    concept: 'O consumo residencial de energia faturado em contas elétricas é medido em quilowatts-hora (kWh).',
    formula: 'E = P · Δt, onde P deve estar em kW (divida Watts por 1000) e Δt em horas.',
    calculation: 'Multiplique a potência em kW pelo número de horas de funcionamento e pelo número de dias do mês.',
  },

  // Setor 9: Desafio ENEM
  'enem-q1': {
    concept: 'As instalações elétricas residenciais e hospitalares operam em paralelo para que cada aparelho funcione de forma independente.',
    formula: 'Em paralelo, todos os equipamentos recebem a mesma tensão nominal (127 V ou 220 V). A corrente total é a soma das correntes: I_tot = ∑ P_k / V.',
    calculation: 'Calcule a corrente demandada por cada aparelho e verifique se a corrente total ultrapassa o valor nominal do disjuntor de segurança.',
  },
  'enem-q2': {
    concept: 'Ao reduzir o comprimento de uma resistência de chuveiro (posição "inverno"), a resistência elétrica diminui.',
    formula: 'Como a tensão da rede é constante, P = V² / R: menor resistência resulta em maior potência e mais aquecimento.',
    calculation: 'Analise a proporção inversa: se R cai, P sobe, elevando a temperatura da água para a mesma vazão.',
  },
};

// Fallback generator for questions without explicit tiered hint
export function getTieredHintsForQuestion(topic: string, tigraoHint: string): TieredHints {
  return {
    concept: `Analise as propriedades elétricas envolvidas no setor de ${topic}. Observe se os componentes estão conectados em série ou paralelo e como a energia se conserva.`,
    formula: 'Aplique as leis fundamentais: Lei de Ohm (V = R·I) ou as equações de potência (P = V·I = R·I² = V²/R).',
    calculation: `Dica do Tigrão: ${tigraoHint}`,
  };
}
