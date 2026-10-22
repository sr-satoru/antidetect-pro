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
    hex: '#1677FF',
    bgRgba: 'rgba(22, 119, 255, 0.14)',
    borderHex: 'rgba(22, 119, 255, 0.4)',
    name: 'Azul',
  },
  {
    id: 'sky',
    hex: '#00A3FF',
    bgRgba: 'rgba(0, 163, 255, 0.14)',
    borderHex: 'rgba(0, 163, 255, 0.4)',
    name: 'Ciano',
  },
  {
    id: 'teal',
    hex: '#00E5BC',
    bgRgba: 'rgba(0, 229, 188, 0.14)',
    borderHex: 'rgba(0, 229, 188, 0.4)',
    name: 'Verde Água',
  },
  {
    id: 'lime',
    hex: '#95E035',
    bgRgba: 'rgba(149, 224, 53, 0.14)',
    borderHex: 'rgba(149, 224, 53, 0.4)',
    name: 'Verde Limão',
  },
  {
    id: 'amber',
    hex: '#FFB020',
    bgRgba: 'rgba(255, 176, 32, 0.14)',
    borderHex: 'rgba(255, 176, 32, 0.4)',
    name: 'Âmbar',
  },
  {
    id: 'orange',
    hex: '#FF7728',
    bgRgba: 'rgba(255, 119, 40, 0.14)',
    borderHex: 'rgba(255, 119, 40, 0.4)',
    name: 'Laranja',
  },
  {
    id: 'red',
    hex: '#FF4D4F',
    bgRgba: 'rgba(255, 77, 79, 0.14)',
    borderHex: 'rgba(255, 77, 79, 0.4)',
    name: 'Vermelho',
  },
  {
    id: 'purple',
    hex: '#7B4DFF',
    bgRgba: 'rgba(123, 77, 255, 0.14)',
    borderHex: 'rgba(123, 77, 255, 0.4)',
    name: 'Roxo',
  },
];

// Estilo Pastel Sólido (estilo Dolphin Anty / AdsPower profissional)
export interface PastelTagStyle {
  color: string;
  backgroundColor: string;
  borderColor: string;
}

export function getPastelTagStyle(colorHex?: string): PastelTagStyle {
  const norm = (colorHex || '').toLowerCase().trim();

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


