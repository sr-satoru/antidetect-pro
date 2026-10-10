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
 * Sanitiza o código antes de ser copiado para a área de transferência:
 * Se o desfoque estiver ativo (showToken === false), remove a chave secreta
 * e a deixa vazia ("").
 */
export const sanitizeCodeForCopy = (
  code: string,
  token: string | undefined,
  showToken: boolean
): string => {
  if (showToken || !token) {
    return code;
  }
  return code.replaceAll(token, '');
};
