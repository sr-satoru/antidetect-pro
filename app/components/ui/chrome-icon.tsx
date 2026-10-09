import React from 'react';

export interface ChromeIconProps {
  size?: number;
  className?: string;
}

export const ChromeIcon: React.FC<ChromeIconProps> = ({
  size = 20,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient
          id="chrome-blue-grad"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(16 16) rotate(90) scale(7)"
        >
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="100%" stopColor="#1A73E8" />
        </radialGradient>
      </defs>

      {/* Setor Vermelho (Superior / Esquerdo) */}
      <path
        d="M16 3C19.8 3 23.2 4.6 25.6 7.2L19.2 18.2C18.4 17.5 17.3 17 16 17H8.8C10.2 8.9 12.8 3 16 3Z"
        fill="#EA4335"
      />
      <path
        d="M16 3C21.7 3 26.6 6.7 28.3 12L20.8 12C19.7 10.2 17.7 9 15.5 9H8.8C10.5 5.3 13 3 16 3Z"
        fill="#EA4335"
      />

      {/* Setor Verde (Inferior / Esquerdo) */}
      <path
        d="M3.7 12C4.5 7.9 6.8 4.4 10 2L17.2 14.5C16.5 15.2 16 16.2 16 17.5L16 25C9.2 25 3.7 19.5 3.7 12Z"
        fill="#34A853"
      />
      <path
        d="M3.7 12C3.7 15.6 4.9 18.9 7 21.6L12.5 12C12.5 12 10.3 13.5 8.8 16C7.5 13.7 7.2 11.2 7.7 8.8L3.7 12Z"
        fill="#34A853"
      />

      {/* Setor Amarelo (Inferior / Direito) */}
      <path
        d="M28.3 12C28.8 13.3 29 14.6 29 16C29 23.2 23.2 29 16 29L21.5 19.5C22.5 18.9 23.2 18 23.5 17L28.3 12Z"
        fill="#FBBC04"
      />
      <path
        d="M16 29C20.5 29 24.5 26.7 26.8 23.2L20.5 12.3C21.9 13.7 22.8 15.7 22.8 18C22.8 21.9 19.7 25 15.8 25L16 29Z"
        fill="#FBBC04"
      />

      {/* Borda Branca do Centro */}
      <circle cx="16" cy="16" r="6.8" fill="#FFFFFF" />

      {/* Centro Azul */}
      <circle cx="16" cy="16" r="5.2" fill="url(#chrome-blue-grad)" />
    </svg>
  );
};
