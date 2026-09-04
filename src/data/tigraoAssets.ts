export type TigraoPose =
  | 'master'
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'pointing'
  | 'explaining'
  | 'concerned'
  | 'alert'
  | 'celebrating'
  | 'gameover'
  | 'working'
  | 'circuit';

export interface TigraoAssetSlot {
  id: TigraoPose;
  name: string;
  description: string;
  sourceUrl: string;
  fallbackSvgMood: 'idle' | 'happy' | 'thinking' | 'alert' | 'celebrating' | 'concerned';
  voiceToneDefault: 'heroic_cadet' | 'cheerful_kid' | 'calm_mentor' | 'energetic_young';
}

export const TIGRAO_MASTER_REFERENCE: TigraoAssetSlot = {
  id: 'master',
  name: 'Tigrão — Referência Master ECIT BAYEUX',
  description: 'Cão astronauta com traje espacial branco e azul com a insígnia oficial ECIT BAYEUX, capacete transparente com LEDs laterais, focinho e olhos expressivos e leais.',
  sourceUrl: '/assets/tigrao/tigrao_master.png',
  fallbackSvgMood: 'idle',
  voiceToneDefault: 'heroic_cadet',
};

export const TIGRAO_POSE_LIBRARY: Record<TigraoPose, TigraoAssetSlot> = {
  master: TIGRAO_MASTER_REFERENCE,
  neutral: {
    id: 'neutral',
    name: 'Tigrão Neutro / Prontidão',
    description: 'Postura atenta de prontidão na ponte de comando da ARES-III.',
    sourceUrl: '/assets/tigrao/tigrao_neutral.png',
    fallbackSvgMood: 'idle',
    voiceToneDefault: 'calm_mentor',
  },
  happy: {
    id: 'happy',
    name: 'Tigrão Feliz',
    description: 'Comemoração calorosa com cauda abanando e olhos brilhantes.',
    sourceUrl: '/assets/tigrao/tigrao_happy.png',
    fallbackSvgMood: 'happy',
    voiceToneDefault: 'cheerful_kid',
  },
  thinking: {
    id: 'thinking',
    name: 'Tigrão Pensando',
    description: 'Olhar reflexivo direcionado ao esquema elétrico para formulação de hipóteses.',
    sourceUrl: '/assets/tigrao/tigrao_thinking.png',
    fallbackSvgMood: 'thinking',
    voiceToneDefault: 'calm_mentor',
  },
  pointing: {
    id: 'pointing',
    name: 'Tigrão Apontando Componente',
    description: 'Gesto indicando resistor, voltímetro ou nó crítico do circuito.',
    sourceUrl: '/assets/tigrao/tigrao_pointing.png',
    fallbackSvgMood: 'thinking',
    voiceToneDefault: 'heroic_cadet',
  },
  explaining: {
    id: 'explaining',
    name: 'Tigrão Explicando Física',
    description: 'Gesto didático elucidando a Lei de Ohm, potência dissipada ou energia.',
    sourceUrl: '/assets/tigrao/tigrao_explaining.png',
    fallbackSvgMood: 'idle',
    voiceToneDefault: 'calm_mentor',
  },
  concerned: {
    id: 'concerned',
    name: 'Tigrão Preocupado',
    description: 'Expressão de apreensão com as vidas de energia chegando perto do fim.',
    sourceUrl: '/assets/tigrao/tigrao_concerned.png',
    fallbackSvgMood: 'concerned',
    voiceToneDefault: 'calm_mentor',
  },
  alert: {
    id: 'alert',
    name: 'Tigrão em Alerta Vermelho',
    description: 'Alerta com LEDs do capacete em tom âmbar indicando cronômetro crítico.',
    sourceUrl: '/assets/tigrao/tigrao_alert.png',
    fallbackSvgMood: 'alert',
    voiceToneDefault: 'energetic_young',
  },
  celebrating: {
    id: 'celebrating',
    name: 'Tigrão Triunfante / Vitória',
    description: 'Salto eufórico de vitória com energia da estação totalmente restaurada.',
    sourceUrl: '/assets/tigrao/tigrao_celebrating.png',
    fallbackSvgMood: 'celebrating',
    voiceToneDefault: 'cheerful_kid',
  },
  gameover: {
    id: 'gameover',
    name: 'Tigrão Acolhedor / Game Over',
    description: 'Olhar motivador acolhendo o astronauta para reiniciar os geradores.',
    sourceUrl: '/assets/tigrao/tigrao_gameover.png',
    fallbackSvgMood: 'concerned',
    voiceToneDefault: 'calm_mentor',
  },
  working: {
    id: 'working',
    name: 'Tigrão Trabalhando com Fios',
    description: 'Conectando cabos e usando alicate térmico em painéis elétricos.',
    sourceUrl: '/assets/tigrao/tigrao_working.png',
    fallbackSvgMood: 'thinking',
    voiceToneDefault: 'heroic_cadet',
  },
  circuit: {
    id: 'circuit',
    name: 'Tigrão no Laboratório',
    description: 'Examinando multímetro e amperímetro na bancada da ARES-III.',
    sourceUrl: '/assets/tigrao/tigrao_circuit.png',
    fallbackSvgMood: 'idle',
    voiceToneDefault: 'heroic_cadet',
  },
};
