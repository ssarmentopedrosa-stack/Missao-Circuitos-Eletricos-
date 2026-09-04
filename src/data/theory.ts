export interface TheoryTopic {
  id: string;
  title: string;
  category: string;
  summary: string;
  formulas: { name: string; formula: string; units: string }[];
  concepts: string[];
  exampleProblem: {
    statement: string;
    resolution: string;
  };
  tips: string[];
}

export const THEORY_TOPICS: TheoryTopic[] = [
  {
    id: 'fundamentos',
    title: 'Grandezas Fundamentais da Eletricidade',
    category: 'Conceitos Básicos',
    summary: 'A eletricidade é baseada no movimento ordenado de portadores de carga elétrica (elétrons livres nos condutores metálicos).',
    formulas: [
      { name: 'Corrente Elétrica', formula: 'I = Q / Δt', units: 'I em Ampères (A), Q em Coulombs (C), Δt em segundos (s)' },
      { name: 'Quantidade de Carga', formula: 'Q = n · e', units: 'n = nº de elétrons, e = 1,6 × 10⁻¹⁹ C' },
      { name: 'Tensão Elétrica (d.d.p.)', formula: 'U = τ / Q', units: 'U em Volts (V), τ em Joules (J), Q em Coulombs (C)' },
    ],
    concepts: [
      'Corrente Elétrica (I): Quantidade de carga que atravessa a seção de um condutor por unidade de tempo.',
      'Tensão ou d.d.p. (U): Energia fornecida pelo gerador por unidade de carga para movimentar os elétrons.',
      'Resistência (R): Dificuldade imposta pelo condutor à passagem dos elétrons livres.',
      'Sentido Real: Do polo negativo (-) para o polo positivo (+).',
      'Sentido Convencional: Do polo positivo (+) para o polo negativo (-).',
    ],
    exampleProblem: {
      statement: 'Uma carga de 180 C passa por um fio durante 1 minuto (60 s). Qual é a corrente?',
      resolution: 'I = Q / Δt = 180 C / 60 s = 3 A.',
    },
    tips: [
      'Lembre-se sempre de converter o tempo para segundos ao calcular a corrente em Ampères!',
      '1 Ampère (A) equivale exatamente a 1 Coulomb por segundo (1 C/s).',
    ],
  },
  {
    id: 'ohm',
    title: 'Leis de Ohm',
    category: 'Resistores e Condutores',
    summary: 'Descrevem a relação fundamental entre tensão e corrente em condutores ôhmicos e a dependência geométrica da resistência.',
    formulas: [
      { name: '1ª Lei de Ohm', formula: 'U = R · I  ⇒  R = U / I  ⇒  I = U / R', units: 'U (Volts, V), R (Ohms, Ω), I (Ampères, A)' },
      { name: '2ª Lei de Ohm', formula: 'R = ρ · L / A', units: 'ρ (resistividade, Ω·m), L (comprimento, m), A (área, m²)' },
    ],
    concepts: [
      'Resistor Ôhmico: Mantém a resistência R constante a temperatura constante. Seu gráfico U × I é uma reta passando pela origem.',
      'Resistividade (ρ): Propriedade intrínseca do material. Metais bons condutores possuem baixíssima resistividade.',
      'Geometria do Condutor: A resistência é DIRETAMENTE proporcional ao comprimento (L) e INVERSAMENTE proporcional à área da seção (A). Fios mais grossos e curtos têm menor resistência.',
    ],
    exampleProblem: {
      statement: 'Um resistor de 25 Ω está submetido a uma d.d.p. de 100 V. Qual a corrente?',
      resolution: 'I = U / R = 100 V / 25 Ω = 4 A.',
    },
    tips: [
      'Se dobrar o comprimento (2L), a resistência dobra. Se dobrar o raio ou a área (2A), a resistência cai pela metade.',
    ],
  },
  {
    id: 'serie',
    title: 'Associação de Resistores em Série',
    category: 'Circuitos',
    summary: 'Os resistores são ligados sequencialmente, existindo apenas um único caminho contínuo para a corrente elétrica.',
    formulas: [
      { name: 'Resistência Equivalente', formula: 'Req = R₁ + R₂ + R₃ + ...', units: 'Req sempre maior que o maior resistor da série' },
      { name: 'Corrente Única', formula: 'I_total = I₁ = I₂ = I₃', units: 'A corrente é estritamente idêntica em todos os pontos' },
      { name: 'Divisão de Tensão', formula: 'U_total = U₁ + U₂ + U₃  (com U_i = R_i · I)', units: 'A tensão total é a soma das quedas parciais' },
    ],
    concepts: [
      'Caminho Único: Não há bifurcações de nós. Toda a carga que passa por R₁ obrigatoriamente passa por R₂.',
      'Falha em Série: Se um resistor for desconectado ou queimar (circuito aberto), a corrente zera em todos os outros.',
      'Divisor de Tensão: O resistor de maior valor resistivo fica com a maior queda de tensão proporcional.',
    ],
    exampleProblem: {
      statement: 'Dois resistores de 10 Ω e 30 Ω em série sob 120 V. Calcule Req, I e U em cada um.',
      resolution: 'Req = 10 + 30 = 40 Ω.  Corrente I = 120 / 40 = 3 A.  Tensões: U₁ = 10 × 3 = 30 V e U₂ = 30 × 3 = 90 V (30 + 90 = 120 V).',
    },
    tips: [
      'A resistência equivalente em série é a simples soma aritmética das resistências.',
    ],
  },
  {
    id: 'paralelo',
    title: 'Associação de Resistores em Paralelo',
    category: 'Circuitos',
    summary: 'Os resistores estão conectados entre os mesmos dois nós, submetidos exatamente à mesma diferença de potencial (tensão).',
    formulas: [
      { name: 'Equivalente (Dois resistores)', formula: 'Req = (R₁ · R₂) / (R₁ + R₂)', units: 'Produto dividido pela soma' },
      { name: 'Equivalente (N iguais)', formula: 'Req = R / N', units: 'Divide a resistência pelo número de ramos' },
      { name: 'Equivalente Geral', formula: '1/Req = 1/R₁ + 1/R₂ + 1/R₃ + ...', units: 'Soma dos inversos das resistências' },
      { name: 'Divisão de Corrente', formula: 'I_total = I₁ + I₂ + I₃  (com I_i = U / R_i)', units: 'Tensão U é a mesma em todos os ramos' },
    ],
    concepts: [
      'Mesma Tensão: Todos os ramos compartilham os mesmos nós, recebendo a voltagem total da fonte (U₁ = U₂ = U).',
      'Divisão de Corrente: A corrente divide-se inversamente à resistência. O ramo de menor resistência conduz maior corrente.',
      'Independência: Se um aparelho for desligado em paralelo, os outros continuam funcionando normalmente (padrão residencial e de naves espaciais).',
    ],
    exampleProblem: {
      statement: 'Dois resistores de 6 Ω e 3 Ω em paralelo sob 12 V. Calcule Req e as correntes.',
      resolution: 'Req = (6 × 3) / (6 + 3) = 18 / 9 = 2 Ω.  Correntes: I₁ = 12 / 6 = 2 A; I₂ = 12 / 3 = 4 A.  I_total = 2 + 4 = 6 A (ou 12 / 2 = 6 A).',
    },
    tips: [
      'A resistência equivalente em paralelo SEMPRE é menor do que o menor resistor individual do conjunto.',
    ],
  },
  {
    id: 'mistos',
    title: 'Circuitos Mistos & Simplificação',
    category: 'Circuitos Avançados',
    summary: 'Circuitos que combinam trechos em série e em paralelo. A resolução é feita por etapas, simplificando blocos de dentro para fora.',
    formulas: [
      { name: 'Estratégia Passo a Passo', formula: '1. Identificar paralelos puros  ⇒  2. Substituir por Req_paralelo  ⇒  3. Somar em série', units: 'Redução progressiva do esquema' },
      { name: 'Curto-Circuito', formula: 'R = 0  ⇒  U = 0 V  (Bypass)', units: 'Corrente total desvia pelo caminho de resistência zero' },
    ],
    concepts: [
      'Identificação de Nós: Nós são pontos onde três ou mais fios se encontram.',
      'Equipotencialidade: Fios ideais sem resistores mantêm o mesmo potencial elétrico.',
      'Curto-circuito: Quando dois pontos de potenciais diferentes são unidos por fio sem resistência, a corrente dispara e o componente em paralelo é ignorado.',
    ],
    exampleProblem: {
      statement: 'R₁ = 5 Ω em série com o paralelo entre R₂ = 20 Ω e R₃ = 20 Ω. Fonte de 30 V.',
      resolution: 'Bloco paralelo: R_p = 20 / 2 = 10 Ω.  Circuito total: Req = 5 + 10 = 15 Ω.  Corrente total: I = 30 / 15 = 2 A.  Queda no paralelo: U_p = 10 Ω × 2 A = 20 V.',
    },
    tips: [
      'Nunca tente somar resistores em série se houver uma derivação (nó) entre eles antes de resolver o nó!',
    ],
  },
  {
    id: 'potencia_energia',
    title: 'Potência Elétrica, Energia & Efeito Joule',
    category: 'Energia e Termodinâmica',
    summary: 'A taxa com que a energia elétrica é convertida em trabalho, luz ou calor (Efeito Joule) em dispositivos e circuitos.',
    formulas: [
      { name: 'Potência Fundamental', formula: 'P = U · I', units: 'P em Watts (W), U em Volts (V), I em Ampères (A)' },
      { name: 'Potência em Resistor (1)', formula: 'P = R · I²', units: 'Ideal quando se conhece a corrente no resistor' },
      { name: 'Potência em Resistor (2)', formula: 'P = U² / R', units: 'Ideal quando a tensão aplicada é constante' },
      { name: 'Energia Consumida', formula: 'E = P · Δt', units: 'Joules (W · s) ou Quilowatts-hora (kW · h)' },
      { name: 'Efeito Joule (Calor)', formula: 'Q = R · I² · t', units: 'Q em Joules (J)' },
    ],
    concepts: [
      'Potência (P): Rapidez de conversão de energia. 1 Watt = 1 Joule por segundo.',
      'Efeito Joule: Aquecimento produzido em qualquer condutor resistivo pela colisão dos elétrons com a rede cristalina do metal.',
      'Fusíveis e Disjuntores: Dispositivos que interrompem a corrente quando ela ultrapassa o limite seguro, evitando incêndios e queima de aparelhos.',
      'Unidades de Energia: 1 kWh = 1000 W × 3600 s = 3.600.000 J = 3,6 × 10⁶ J.',
    ],
    exampleProblem: {
      statement: 'Um motor de 2200 W funciona em 220 V durante 5 horas. Calcule a corrente e a energia em kWh.',
      resolution: 'Corrente: I = P / U = 2200 / 220 = 10 A.  Energia: E = 2,2 kW × 5 h = 11 kWh.',
    },
    tips: [
      'Para calcular em kWh, divida a potência em Watts por 1000 antes de multiplicar pelas horas!',
    ],
  },
  {
    id: 'medicao',
    title: 'Instrumentos de Medição Elétrica',
    category: 'Medições e Laboratório',
    summary: 'Regras práticas e teóricas para o uso correto de Amperímetros, Voltímetros e Ohmímetros em bancada e na estação espacial.',
    formulas: [
      { name: 'Amperímetro Ideal', formula: 'R_int = 0 Ω (Ligação em Série)', units: 'Não introduz queda de tensão adicional' },
      { name: 'Voltímetro Ideal', formula: 'R_int = ∞ Ω (Ligação em Paralelo)', units: 'Não desvia corrente do circuito' },
      { name: 'Ohmímetro', formula: 'Mede R com circuito desenergizado', units: 'Nunca medir com a fonte ligada!' },
    ],
    concepts: [
      'Amperímetro: Deve ser inserido no caminho da corrente (em série). Se for ligado por engano em paralelo, provocará um curto-circuito!',
      'Voltímetro: Deve ser conectado nos dois pontos cuja diferença de potencial se quer medir (em paralelo). Se ligado em série, bloqueia a passagem da corrente por sua alta resistência.',
    ],
    exampleProblem: {
      statement: 'Ao medir a d.d.p. em uma lâmpada acesa, como as pontas de prova do multímetro devem ser posicionadas?',
      resolution: 'Em modo voltímetro, em paralelo diretamente sobre os terminais da lâmpada.',
    },
    tips: [
      'Amperímetro = Série = Resistência Zero. Voltímetro = Paralelo = Resistência Infinita.',
    ],
  },
];
