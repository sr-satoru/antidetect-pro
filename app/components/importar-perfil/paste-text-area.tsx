import React, { useEffect, useState } from 'react';
import { parseAdsPowerText } from '@/services/importar-perfil/service.parser-adspower';
import type { ImportPreviewItem } from '@/services/importar-perfil/service.types';
import { CheckCircle2 } from 'lucide-react';

interface PasteTextAreaProps {
  onProfilesParsed: (profiles: ImportPreviewItem[], rawText: string) => void;
  rawText: string;
}

export const PasteTextArea: React.FC<PasteTextAreaProps> = ({
  onProfilesParsed,
  rawText,
}) => {
  const [text, setText] = useState(rawText);

  useEffect(() => {
    setText(rawText);
  }, [rawText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text.trim()) {
        const parsed = parseAdsPowerText(text);
        onProfilesParsed(parsed, text);
      } else {
        onProfilesParsed([], '');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [text, onProfilesParsed]);

  // Conta asteriscos / separadores de bloco
  const detectedCount = React.useMemo(() => {
    if (!text.trim()) return 0;
    return parseAdsPowerText(text).length;
  }, [text]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Cole aqui o texto exportado do AdsPower...\n\nExemplo:\nacc_id=123456\nid=k1abc123\nname=perfil_01\ncookie=[{"name":"auth_token","value":"xyz"...}]\nproxytype=socks5\nproxy=127.0.0.1:1080:user:pass\n******************`}
          className="w-full rounded-2xl border border-slate-300 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-4 font-mono text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7284] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:outline-hidden transition-colors resize-y shadow-xs"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9DA2B4] px-1 select-none">
        <span>
          Cada perfil no AdsPower é delimitado por uma linha com asteriscos (<code className="text-[#7C3AED] dark:text-[#A78BFA]">******************</code>).
        </span>

        {detectedCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={13} />
            {detectedCount} {detectedCount === 1 ? 'perfil detectado' : 'perfis detectados'}
          </span>
        ) : (
          <span className="text-slate-400 dark:text-[#6C7284]">
            Nenhum perfil detectado ainda
          </span>
        )}
      </div>
    </div>
  );
};
