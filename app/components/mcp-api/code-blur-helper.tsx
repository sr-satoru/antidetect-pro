import React from 'react';
import { Tooltip } from '@/components/ui/tooltip';

/**
 * Renderiza um código ou texto substituindo as ocorrências da chave secreta
 * por um badge com efeito de desfoque (blur) quando a chave estiver oculta.
 */
export const renderCodeWithKeyBlur = (
  code: string,
  token: string | undefined,
  showToken: boolean,
  onReveal?: () => void
): React.ReactNode => {
  if (!token || showToken || !code.includes(token)) {
    return code;
  }

  const parts = code.split(token);

  return (
    <>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <Tooltip
              content="Chave protegida por privacidade. Clique para revelar."
              position="top"
            >
              <span
                onClick={onReveal}
                className="inline-block filter blur-[5px] select-none text-slate-400 dark:text-[#A7AAB9] bg-slate-200/50 dark:bg-white/5 px-1.5 py-0.5 rounded transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10"
              >
                {token}
              </span>
            </Tooltip>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

/**
 * Retorna o código pronto para a área de transferência:
 * Mantém o token ativo para permitir que o usuário copie e execute imediatamente
 * em seu terminal ou IDE sem quebras de cabeçalho.
 */
export const sanitizeCodeForCopy = (
  code: string,
  _token: string | undefined,
  _showToken: boolean
): string => {
  return code;
};
