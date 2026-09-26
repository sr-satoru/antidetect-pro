import React from 'react';
import { getTagColorStyle } from './tag-palette';
import { X } from 'lucide-react';

interface TagBadgeProps {
  name: string;
  color?: string;
  className?: string;
  onRemove?: () => void;
  onClick?: () => void;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  name,
  color,
  className = '',
  onRemove,
  onClick,
}) => {
  const styles = getTagColorStyle(color);

  return (
    <span
      onClick={onClick}
      style={{
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        color: styles.color,
      }}
      className={`inline-flex items-center gap-1.5 shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all select-none ${
        onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : ''
      } ${className}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: styles.color }}
      />
      <span className="truncate max-w-[120px]">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/30 transition-colors"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
};

export default TagBadge;
