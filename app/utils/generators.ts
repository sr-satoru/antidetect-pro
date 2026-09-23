/**
 * Funções utilitárias para geração de parâmetros aleatórios de fingerprints,
 * identificadores de hardware e nomes de dispositivos simulados.
 */

export const generateRandomSeed = (): string => {
  return Math.random().toString(16).substring(2, 10).toUpperCase();
};

export const generateRandomDeviceName = (os: string = 'linux'): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 7; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const normOs = os.toLowerCase();
  return `${rand}-${
    normOs === 'macos'
      ? 'MacBook'
      : normOs === 'android'
        ? 'Pixel'
        : normOs === 'ios'
          ? 'iPhone'
          : 'laptop'
  }`;
};

export const generateRandomMacAddress = (): string => {
  const hex = '0123456789abcdef';
  const parts = ['50', '54', '00'];
  for (let i = 0; i < 3; i++) {
    parts.push(
      hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)],
    );
  }
  return parts.join(':');
};
