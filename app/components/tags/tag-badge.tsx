import React from 'react';
import { getTagColorStyle, getPastelTagStyle, getVividTagStyle } from './tag-palette';
import { serviceTags } from '../../services/tags/service.tags';
import { X } from 'lucide-react';

export interface TagBadgeProps {
  name: string;
  color?: string;
  className?: string;
  variant?: 'vivid' | 'solid-pastel' | 'default';
  showDot?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  maxWidth?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  name,
  color,
  className = '',
  variant = 'vivid',
  showDot,
  onRemove,
  onClick,
  maxWidth,
}) => {
  // Prioridade de cor: se não foi fornecida cor diretamente, resolve no catálogo do serviceTags
  const resolvedColor = color || (name ? serviceTags.getColorByName(name) : undefined);

  const isPastel = variant === 'solid-pastel';
  const isDefault = variant === 'default';
  const isVivid = !isPastel && !isDefault;

  const styles = isPastel
    ? getPastelTagStyle(resolvedColor, name)
    : isDefault
    ? getTagColorStyle(resolvedColor)
    : getVividTagStyle(resolvedColor, name);

  const shouldShowDot = showDot !== undefined ? showDot : isDefault;

  return (
    <span
      onClick={onClick}
      style={{
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        color: styles.color,
      }}
      className={`inline-flex items-center gap-1.5 shrink-0 ${
        isVivid
          ? 'rounded-[4px] border px-2 py-[2.5px] text-[11px] font-semibold leading-tight shadow-xs'
          : isPastel
          ? 'rounded-[4px] border px-2 py-[2.5px] text-[11px] font-medium leading-tight shadow-2xs'
          : 'rounded-md border px-2 py-0.5 text-[11px] font-medium'
      } transition-all select-none ${
        onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : ''
      } ${className}`}
      title={name}
    >
      {shouldShowDot && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: styles.color }}
        />
      )}
      <span className={`truncate ${maxWidth || 'max-w-[220px]'}`}>{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/25 active:bg-black/40 transition-colors cursor-pointer"
          title={`Remover etiqueta ${name}`}
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
};

export default TagBadge;
