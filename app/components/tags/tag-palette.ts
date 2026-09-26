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
