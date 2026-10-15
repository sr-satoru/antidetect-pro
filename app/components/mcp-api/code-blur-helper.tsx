import React from 'react';

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
            <span
              onClick={onReveal}
              className="inline-block filter blur-[5px] select-none text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded transition-all cursor-pointer hover:bg-emerald-500/25"
              title="Chave oculta por privacidade (Modo Seguro). Clique no ícone de Visualizar no topo ou aqui para revelar."
            >
              {token}
            </span>
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
