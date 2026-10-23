# 🛡️ Diretrizes de Stealth e Coerência para o AstroBrowser (Clearcote)

Esta regra estabelece os guardrails obrigatórios para o motor **AstroBrowser** (Clearcote Chromium) e seu backend associado, garantindo que o navegador não seja detectado por WAFs e desafios anti-bot (especialmente Cloudflare / Turnstile), mesmo em conexões diretas sem proxy.

## 1. Invariantes de Versão do Navegador (Evitar Versões Futuras)
- **Nunca declarar versões sintéticas ou futuras:** O Chrome 150 não existe no tráfego público global. Sempre utilize a versão estável compatível com a compilação (faixa Chrome 134 ~ 136).
- **Proibido Windows 19.0.0:** Em Client Hints (`Sec-CH-UA-Platform-Version`), utilize estritamente `"15.0.0"` (Windows 11) ou `"10.0.0"` (Windows 10).
- **Formato User-Agent Reduction:** O cabeçalho HTTP `User-Agent` deve respeitar o congelamento do Chrome (`Chrome/<major>.0.0.0`), sem expor os 4 blocos de compilação interna no cabeçalho HTTP principal.

## 2. Coerência Estrita entre Cabeçalhos HTTP e Client Hints
- O número maior (major version) do `User-Agent` deve ser **100% idêntico** ao reportado em `Sec-CH-UA`.
- Ao alterar o `user_agent` do perfil, atualize simultaneamente `--fingerprint-brand-version` e `--fingerprint-tls-profile` para corresponder à mesma versão maior.

## 3. Controle de Farbling (Canvas e WebGL) contra Desafios Turnstile
- O Cloudflare Turnstile valida o hash matemático e os fragment shaders do Canvas e WebGL. O algoritmo `ShuffleSubchannelColorData` do Clearcote adultera bits dos pixels, causando falha criptográfica imediata no Turnstile (loop infinito ou tela de bloqueio).
- Para perfis destinados à navegação em sites protegidos por Turnstile ou Cloudflare, **sempre utilize as flags de desativação de ruído**:
  * `--cc-no-farble`
  * `--disable-fingerprint-noise`
  * `--disable-canvas-noise`
- Isso preserva a persona completa (GPU, Hardware, Telas, TLS), mas mantém a fidelidade dos cálculos geométricos e de shader.

## 4. Isolamento de CDP em Perfis Interativos
- Nunca force `--remote-debugging-port` para perfis iniciados em modo de navegação interativa/manual do usuário (`cdp: false`).
- O polling a cada 4 segundos via WebSocket CDP (`Storage.getCookies`) deve ser desativado durante a navegação interativa para evitar anomalias de temporização no Event Loop do V8 monitoradas pelo Turnstile.

## 5. Extensões e Bloqueadores de Conteúdo
- Bloqueadores de anúncios como uBlock Origin ou Adblock Plus nos perfis devem conter exceção explícita para domínios de desafio:
  * `challenges.cloudflare.com`
  * `*.cloudflarestream.com`
