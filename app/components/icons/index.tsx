import React from 'react';
import astrobowserSvg from './astrobowser.svg';
import strofoxSvg from './strofox.svg';

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

export default {
  AstroBrowserIcon,
  AstroFoxIcon,
};
