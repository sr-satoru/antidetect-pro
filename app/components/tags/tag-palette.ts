/**
 * Paleta oficial de cores para Etiquetas (Tags),
 * baseada no padrão dos browsers multilogin profissionais.
 */
export interface TagColor {
  id: string;
  hex: string;
  bgRgba: string;
  borderHex: string;
  name: string;
}

export const TAG_COLORS: TagColor[] = [
  {
    id: 'blue',
    hex: '#2563EB',
    bgRgba: 'rgba(37, 99, 235, 0.16)',
    borderHex: 'rgba(37, 99, 235, 0.4)',
    name: 'Azul',
  },
  {
    id: 'sky',
    hex: '#0284C7',
    bgRgba: 'rgba(2, 132, 199, 0.16)',
    borderHex: 'rgba(2, 132, 199, 0.4)',
    name: 'Ciano',
  },
  {
    id: 'teal',
    hex: '#0D9488',
    bgRgba: 'rgba(13, 148, 136, 0.16)',
    borderHex: 'rgba(13, 148, 136, 0.4)',
    name: 'Verde Água',
  },
  {
    id: 'green',
    hex: '#16A34A',
    bgRgba: 'rgba(22, 163, 74, 0.16)',
    borderHex: 'rgba(22, 163, 74, 0.4)',
    name: 'Verde',
  },
  {
    id: 'amber',
    hex: '#D97706',
    bgRgba: 'rgba(217, 119, 6, 0.16)',
    borderHex: 'rgba(217, 119, 6, 0.4)',
    name: 'Âmbar',
  },
  {
    id: 'orange',
    hex: '#EA580C',
    bgRgba: 'rgba(234, 88, 12, 0.16)',
    borderHex: 'rgba(234, 88, 12, 0.4)',
    name: 'Laranja',
  },
  {
    id: 'red',
    hex: '#DC2626',
    bgRgba: 'rgba(220, 38, 38, 0.16)',
    borderHex: 'rgba(220, 38, 38, 0.4)',
    name: 'Vermelho',
  },
  {
    id: 'purple',
    hex: '#7C3AED',
    bgRgba: 'rgba(124, 58, 237, 0.16)',
    borderHex: 'rgba(124, 58, 237, 0.4)',
    name: 'Roxo',
  },
];

// Estilo Pastel Sólido (estilo Dolphin Anty / AdsPower profissional)
export interface PastelTagStyle {
  color: string;
  backgroundColor: string;
  borderColor: string;
}

export function getPastelTagStyle(colorHex?: string, fallbackName?: string): PastelTagStyle {
  let norm = (colorHex || '').toLowerCase().trim();

  // Se não foi informada cor mas temos o nome da tag, seleciona uma cor vibrante consistente
  if (!norm && fallbackName) {
    let hash = 0;
    const cleanName = fallbackName.trim().toLowerCase();
    for (let i = 0; i < cleanName.length; i++) {
      hash = (hash << 5) - hash + cleanName.charCodeAt(i);
      hash |= 0;
    }
    const colorItem = TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
    norm = colorItem.hex.toLowerCase();
  }

  // 1. Vermelho / Rosa (ex: #FF4D4F, red, pink, etc.)
  if (
    norm === '#ff4d4f' ||
    norm === 'red' ||
    norm === 'vermelho' ||
    norm === 'pink' ||
    norm === 'rosa' ||
    norm === '#f43f5e' ||
    norm === '#ef4444' ||
    norm.includes('red') ||
    norm.includes('pink')
  ) {
    return {
      color: '#1E293B',
      backgroundColor: '#FFDADA',
      borderColor: '#FFB8B8',
    };
  }

  // 2. Azul (ex: #1677FF, blue, azul, etc.)
  if (
    norm === '#1677ff' ||
    norm === 'blue' ||
    norm === 'azul' ||
    norm === '#2563eb' ||
    norm === '#3b82f6' ||
    norm.includes('blue') ||
    norm.includes('azul')
  ) {
    return {
      color: '#1E293B',
      backgroundColor: '#D6ECFF',
      borderColor: '#AFD8FF',
    };
  }

  // 3. Ciano / Sky (ex: #00A3FF, sky, ciano, etc.)
  if (
    norm === '#00a3ff' ||
    norm === 'sky' ||
    norm === 'ciano' ||
    norm === '#0ea5e9' ||
    norm === '#06b6d4'
  ) {
    return {
      color: '#1E293B',
      backgroundColor: '#D6F4FF',
      borderColor: '#A6E5FF',
    };
  }

  // 4. Verde Água / Teal (ex: #00E5BC, teal, etc.)
  if (
    norm === '#00e5bc' ||
    norm === 'teal' ||
    norm === '#14b8a6' ||
    norm === '#10b981'
  ) {
    return {
      color: '#1E293B',
      backgroundColor: '#D4F7EC',
      borderColor: '#A3EDD5',
    };
  }

  // 5. Verde Limão / Lime (ex: #95E035, lime, verde, etc.)
  if (
    norm === '#95e035' ||
    norm === 'lime' ||
    norm === 'verde' ||
    norm === '#84cc16'
  ) {
    return {
      color: '#1E293B',
      backgroundColor: '#EAF7D3',
      borderColor: '#CEEE9B',
    };
  }

  // 6. Âmbar / Amarelo (ex: #FFB020, amber, amarelo, etc.)
  if (
    norm === '#ffb020' ||
    norm === 'amber' ||
    norm === 'amarelo' ||
    norm === '#f59e0b' ||
    norm === '#eab308'
  ) {
    return {
      color: '#1E293B',
      backgroundColor: '#FFF0D0',
      borderColor: '#FFDC96',
    };
  }

  // 7. Laranja / Orange (ex: #FF7728, orange, laranja, etc.)
  if (
    norm === '#ff7728' ||
    norm === 'orange' ||
    norm === 'laranja' ||
    norm === '#f97316'
  ) {
    return {
      color: '#1E293B',
      backgroundColor: '#FFE5D4',
      borderColor: '#FFC49E',
    };
  }

  // 8. Roxo / Purple (ex: #7B4DFF, purple, roxo, etc.)
  if (
    norm === '#7b4dff' ||
    norm === 'purple' ||
    norm === 'roxo' ||
    norm === '#8b5cf6' ||
    norm === '#a855f7'
  ) {
    return {
      color: '#1E293B',
      backgroundColor: '#EDE4FF',
      borderColor: '#D0BFFF',
    };
  }

  // 9. Se for um código HEX personalizado (#RRGGBB)
  if (norm.startsWith('#') && (norm.length === 7 || norm.length === 4)) {
    let fullHex = norm;
    if (norm.length === 4) {
      fullHex = `#${norm[1]}${norm[1]}${norm[2]}${norm[2]}${norm[3]}${norm[3]}`;
    }
    const r = parseInt(fullHex.slice(1, 3), 16);
    const g = parseInt(fullHex.slice(3, 5), 16);
    const b = parseInt(fullHex.slice(5, 7), 16);

    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      // Clona para um pastel suave e opaco de alto requinte
      const bgR = Math.round(r * 0.18 + 255 * 0.82);
      const bgG = Math.round(g * 0.18 + 255 * 0.82);
      const bgB = Math.round(b * 0.18 + 255 * 0.82);

      const bdR = Math.round(r * 0.32 + 255 * 0.68);
      const bdG = Math.round(g * 0.32 + 255 * 0.68);
      const bdB = Math.round(b * 0.32 + 255 * 0.68);

      return {
        color: '#1E293B',
        backgroundColor: `rgb(${bgR}, ${bgG}, ${bgB})`,
        borderColor: `rgb(${bdR}, ${bdG}, ${bdB})`,
      };
    }
  }

  // Fallback cinza pastel suave
  return {
    color: '#1E293B',
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  };
}

export const DEFAULT_TAG_COLOR = TAG_COLORS[0].hex;

// Calibra a cor para manter saturação vívida e marcante, sem ofuscamento/luminosidade excessiva
export function toneDownHighLuminance(hex: string): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) return hex;

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;

  // Luminância percebida padrão ITU-R BT.601
  const perceivedLuminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Se a luminosidade for ofuscante/muito clara (> 0.48), reduz a intensidade mantendo a saturação rica
  if (perceivedLuminance > 0.48) {
    const scale = 0.44 / perceivedLuminance;
    const rNew = Math.min(255, Math.round(r * 255 * scale));
    const gNew = Math.min(255, Math.round(g * 255 * scale));
    const bNew = Math.min(255, Math.round(b * 255 * scale));
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(rNew)}${toHex(gNew)}${toHex(bNew)}`;
  }

  return hex;
}

// Estilo Vívido e Marcante (cores saturadas, ricas e nítidas sem luminosidade ofuscante)
export interface VividTagStyle {
  color: string;
  backgroundColor: string;
  borderColor: string;
}

export function getVividTagStyle(colorHex?: string, fallbackName?: string): VividTagStyle {
  let hex = (colorHex || '').trim();

  // Se não foi informada cor mas temos o nome da tag, seleciona uma cor vibrante consistente do catálogo
  if (!hex && fallbackName) {
    let hash = 0;
    const cleanName = fallbackName.trim().toLowerCase();
    for (let i = 0; i < cleanName.length; i++) {
      hash = (hash << 5) - hash + cleanName.charCodeAt(i);
      hash |= 0;
    }
    const colorItem = TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
    hex = colorItem.hex;
  }

  // Normaliza nomes de cores e hexadecimais para garantir saturação vívida sem claridade/luminosidade excessiva
  const norm = hex.toLowerCase();
  const matched = TAG_COLORS.find(
    (c) => c.id.toLowerCase() === norm || c.name.toLowerCase() === norm || c.hex.toLowerCase() === norm,
  );
  if (matched) {
    hex = matched.hex;
  } else if (!hex.startsWith('#')) {
    if (norm.includes('red') || norm.includes('vermelho') || norm.includes('pink') || norm.includes('rosa')) {
      hex = '#DC2626';
    } else if (norm.includes('orange') || norm.includes('laranja')) {
      hex = '#EA580C';
    } else if (norm.includes('green') || norm.includes('verde') || norm.includes('lime')) {
      hex = '#16A34A';
    } else if (norm.includes('purple') || norm.includes('roxo')) {
      hex = '#7C3AED';
    } else if (norm.includes('cyan') || norm.includes('sky') || norm.includes('ciano')) {
      hex = '#0284C7';
    } else if (norm.includes('yellow') || norm.includes('amarelo') || norm.includes('amber')) {
      hex = '#D97706';
    } else {
      hex = '#2563EB';
    }
  }

  // Aplica calibração para garantir que nenhuma cor fique ofuscante/com luminosidade excessiva
  const finalBg = toneDownHighLuminance(hex);

  return {
    color: '#FFFFFF',
    backgroundColor: finalBg,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  };
}

export function getTagColorStyle(colorHex?: string): {
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  const match = TAG_COLORS.find(
    (c) => c.hex.toLowerCase() === (colorHex || '').toLowerCase(),
  );
  if (match) {
    return {
      color: match.hex,
      backgroundColor: match.bgRgba,
      borderColor: match.borderHex,
    };
  }

  // Se não encontrar, fallback para cinza suave
  return {
    color: colorHex || '#C8CBD4',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  };
}



