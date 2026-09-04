export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  secret?: boolean;
}

export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: 'first_spark',
    title: 'Primeira Faísca',
    description: 'Completou o diagnóstico inicial do Setor 1 (Conceitos Fundamentais).',
    icon: 'Zap',
  },
  {
    id: 'ohm_master',
    title: 'Guardião da 1ª Lei',
    description: 'Estabilizou as matrizes de energia com a Lei de Ohm no Setor 2.',
    icon: 'Activity',
  },
  {
    id: 'series_guardian',
    title: 'Mestre da Série',
    description: 'Equilibrou a corrente contínua dos conduítes em série do Setor 3.',
    icon: 'Lightbulb',
  },
  {
    id: 'parallel_wizard',
    title: 'Mago dos Nós Paralelos',
    description: 'Evitou curto-circuitos no sistema de distribuição do Setor 4.',
    icon: 'Radio',
  },
  {
    id: 'mixed_architect',
    title: 'Arquiteto de Circuitos Mistos',
    description: 'Decifrou redes elétricas complexas e nós de ponte no Setor 5.',
    icon: 'Cpu',
  },
  {
    id: 'power_engineer',
    title: 'Engenheiro de Potência',
    description: 'Maximizou o rendimento energético e dimensionou cargas no Setor 6.',
    icon: 'Gauge',
  },
  {
    id: 'thermal_protector',
    title: 'Protetor Térmico',
    description: 'Dissipou calor crítico e calculou consumo em kWh no Setor 7.',
    icon: 'Flame',
  },
  {
    id: 'orbit_hero',
    title: 'Herói de ARES-III',
    description: 'Reativou o Núcleo de Fusão e salvou a Estação Orbital no Setor 8.',
    icon: 'Rocket',
  },
  {
    id: 'enem_champion',
    title: 'Mestre Supremo & Campeão ENEM',
    description: 'Superou com distinção a bateria especial do Desafio ENEM.',
    icon: 'Trophy',
  },
  {
    id: 'perfect_streak',
    title: 'Engenheiro Imbatível',
    description: 'Alcançou uma sequência de 5 acertos seguidos sem falhas na telemetria.',
    icon: 'Sparkles',
  },
];
