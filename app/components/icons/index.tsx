import React from 'react';
import astrobowserSvg from './astrobowser.svg';
import strofoxSvg from './strofox.svg';
import ipSucessoSvg from './ipSucesso.svg';
import ipfailSvg from './ipfail.svg';

export interface CustomBrowserIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AstroBrowserIcon: React.FC<CustomBrowserIconProps> = ({
  size = 15,
  className = '',
  style = {},
}) => (
  <img
    src={astrobowserSvg}
    width={size}
    height={size}
    alt="AstroBrowser"
    className={`shrink-0 object-contain select-none pointer-events-none ${className}`}
    style={{ width: `${size}px`, height: `${size}px`, ...style }}
  />
);

export const AstroFoxIcon: React.FC<CustomBrowserIconProps> = ({
  size = 15,
  className = '',
  style = {},
}) => (
  <img
    src={strofoxSvg}
    width={size}
    height={size}
    alt="AstroFox"
    className={`shrink-0 object-contain select-none pointer-events-none ${className}`}
    style={{ width: `${size}px`, height: `${size}px`, ...style }}
  />
);

export interface CustomIpIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const IpSuccessIcon: React.FC<CustomIpIconProps> = ({
  size = 16,
  className = '',
  style = {},
}) => (
  <img
    src={ipSucessoSvg}
    width={size}
    height={size}
    alt="Proxy Conectado"
    className={`shrink-0 object-contain select-none pointer-events-none ${className}`}
    style={{ width: `${size}px`, height: `${size}px`, ...style }}
  />
);

export const IpFailIcon: React.FC<CustomIpIconProps> = ({
  size = 16,
  className = '',
  style = {},
}) => (
  <img
    src={ipfailSvg}
    width={size}
    height={size}
    alt="Sem Proxy"
    className={`shrink-0 object-contain select-none pointer-events-none ${className}`}
    style={{ width: `${size}px`, height: `${size}px`, ...style }}
  />
);

export default {
  AstroBrowserIcon,
  AstroFoxIcon,
  IpSuccessIcon,
  IpFailIcon,
};
