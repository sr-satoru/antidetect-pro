import React from 'react';

export interface FirefoxIconProps {
  size?: number;
  className?: string;
}

export const FirefoxIcon: React.FC<FirefoxIconProps> = ({
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
        {/* Gradiente do Globo Central */}
        <radialGradient
          id="ff-globe-grad"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(13 14) rotate(50) scale(12)"
        >
          <stop offset="0%" stopColor="#4A154B" />
          <stop offset="35%" stopColor="#2E1160" />
          <stop offset="70%" stopColor="#0B379B" />
          <stop offset="100%" stopColor="#0066FF" />
        </radialGradient>

        {/* Gradiente da Chama Externa (Cauda e Corpo) */}
        <linearGradient
          id="ff-flame-main"
          x1="3"
          y1="29"
          x2="29"
          y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#9E0059" />
          <stop offset="25%" stopColor="#E6004C" />
          <stop offset="50%" stopColor="#FF4F00" />
          <stop offset="75%" stopColor="#FF9100" />
          <stop offset="100%" stopColor="#FFD000" />
        </linearGradient>

        {/* Gradiente da Asa/Cauda Inferior */}
        <linearGradient
          id="ff-flame-tail"
          x1="6"
          y1="8"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFDE00" />
          <stop offset="30%" stopColor="#FF6B00" />
          <stop offset="70%" stopColor="#D9004C" />
          <stop offset="100%" stopColor="#550066" />
        </linearGradient>

        {/* Gradiente da Cabeça e Orelha */}
        <linearGradient
          id="ff-flame-head"
          x1="18"
          y1="4"
          x2="28"
          y2="14"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="40%" stopColor="#FF9400" />
          <stop offset="100%" stopColor="#FF2A2A" />
        </linearGradient>
      </defs>

      {/* Globo Central */}
      <circle cx="16" cy="16" r="10.5" fill="url(#ff-globe-grad)" />

      {/* Continente / Nuvem azul ciano no globo */}
      <path
        d="M11 12.5C12.5 11 14.5 10.5 16 11C17.5 11.5 18.5 11 20 11.8C20.8 12.2 21.2 13.5 21 14.5C20.8 16 19.5 17 18 17.8C16.5 18.5 15.5 19.8 13.5 19.8C12 19.8 11.2 18.8 10.8 17.5C10.5 16 10.2 14.5 11 12.5Z"
        fill="#00D2FF"
        fillOpacity="0.45"
      />

      {/* Cauda que envolve a base do globo */}
      <path
        d="M28.5 11C28.1 9.5 27.2 8.1 26 7.2C24.5 6 22.8 5.4 21 5.5C21.8 6.4 22.2 7.6 22 8.7C21.7 9.8 21 10.7 20 11.2C18.8 11.8 17.5 11.8 16.4 11.4C15.2 11 14.2 10.1 13.6 9C13 7.8 12.9 6.5 13.3 5.3C11.5 5.8 9.9 6.8 8.8 8.3C7.3 10.2 6.5 12.6 6.6 15C6.7 16.2 7 17.4 7.5 18.4C6.7 18 6.1 17.2 5.8 16.3C5 17.8 4.8 19.6 5.3 21.3C6.1 23.6 7.9 25.5 10.1 26.6C12.3 27.7 14.8 28 17.2 27.5C20.4 26.9 23.3 24.9 25 22.2C26.7 19.5 27.2 16.2 26.3 13.1C26.1 12.5 25.8 11.9 25.4 11.3C26.4 12.1 27.2 13.1 27.7 14.3C28.7 16.5 28.7 19 27.8 21.2C29.1 19.8 29.8 18 29.9 16.1C30 14.2 29.5 12.4 28.5 11Z"
        fill="url(#ff-flame-tail)"
      />

      {/* Corpo principal e cauda superior com fogo vivo */}
      <path
        d="M28.8 11.8C27.8 9 25.7 6.6 23 5.2C21.2 4.3 19.2 3.9 17.3 4.1C18.3 5 18.9 6.2 19 7.4C19.1 8.7 18.6 9.9 17.7 10.8C16.7 11.8 15.3 12.2 14 12C12.7 11.8 11.6 11 10.9 9.9C10 8.6 9.8 7 10.3 5.5C8.3 6.4 6.7 8 5.6 9.9C4.1 12.3 3.4 15.2 3.6 18.1C3.8 21 5.1 23.7 7.2 25.7C9.3 27.7 12.1 28.9 15.1 29.1C18.7 29.3 22.3 28 24.9 25.6C27.5 23.1 29 19.6 29.1 15.9C29.2 14.5 28.9 13.1 28.3 11.8C29 12.9 29.4 14.1 29.5 15.4C29.8 13.5 29.5 12.6 28.8 11.8Z"
        fill="url(#ff-flame-main)"
      />

      {/* Cabeça da Raposa, Focinho e Olho Iluminado */}
      <path
        d="M24.2 9C23.7 8.2 23 7.5 22.1 7C21.2 6.5 20.3 6.3 19.3 6.3C19.9 7.1 20.2 8.1 20 9C19.8 9.9 19.2 10.7 18.4 11.2C17.4 11.8 16.2 11.9 15.2 11.6C14.1 11.3 13.2 10.6 12.6 9.6C12.1 8.8 11.9 7.8 12.1 6.8C10.7 7.7 9.7 9 9.2 10.5C8.7 12 8.7 13.7 9.2 15.2C9.7 16.7 10.7 18 12 18.9C13.3 19.8 14.9 20.3 16.5 20.2C18.6 20.1 20.6 19.2 22 17.7C23.4 16.2 24.2 14.1 24.1 12C24.1 10.9 23.7 9.8 23 9C23.6 9.6 24.1 10.4 24.4 11.2C24.8 10.4 24.7 9.7 24.2 9Z"
        fill="url(#ff-flame-head)"
      />

      {/* Brilho no focinho / orelha */}
      <path
        d="M21.5 6.5C20.5 6.4 19.5 6.6 18.6 7.1C19.2 7.7 19.6 8.5 19.5 9.3C19.4 10.2 18.8 11 18 11.5C17.1 12 16 12.1 15 11.7C16.5 12.8 18.4 13.2 20.2 12.7C21.9 12.2 23.3 10.9 23.8 9.2C23.3 8.3 22.5 7.4 21.5 6.5Z"
        fill="#FFFFFF"
        fillOpacity="0.4"
      />
    </svg>
  );
};

export default FirefoxIcon;
