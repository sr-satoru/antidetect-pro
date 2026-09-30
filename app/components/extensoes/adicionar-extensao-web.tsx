import React, { useState, useEffect } from 'react';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  ExternalLink,
  Flame,
  Globe,
} from 'lucide-react';
import { FirefoxIcon } from '../ui/firefox-icon';

export interface ExtensaoWebFormValues {
  url: string;
}

interface AdicionarExtensaoWebProps {
  values: ExtensaoWebFormValues;
  onChange: (field: keyof ExtensaoWebFormValues, value: string) => void;
}

export const AdicionarExtensaoWeb: React.FC<AdicionarExtensaoWebProps> = ({
  values,
  onChange,
}) => {
  const [storeType, setStoreType] = useState<'firefox' | 'chrome'>('firefox');

  // Detecta automaticamente a loja com base na URL digitada/colada
  useEffect(() => {
    const urlLower = values.url.toLowerCase();
    if (urlLower.includes('addons.mozilla.org')) {
      setStoreType('firefox');
    } else if (
      urlLower.includes('chromewebstore.google.com') ||
      urlLower.includes('chrome.google.com')
    ) {
      setStoreType('chrome');
    }
  }, [values.url]);

  return (
    <div className="space-y-5 text-[13px] text-[#C8CBD4]">
      {/* 1. Seleção da Loja Online */}
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <label className="text-right text-[12.5px] font-medium text-[#C8CBD4] select-none sm:col-span-3">
          Loja de origem
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-9">
          <button
            type="button"
            onClick={() => setStoreType('firefox')}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              storeType === 'firefox'
                ? 'border-[#FF7139] bg-[#FF7139]/15 text-[#FFA07A] shadow-xs'
                : 'border-[#333543] bg-[#161720] text-[#8E92A2] hover:border-[#444758] hover:text-white'
            }`}
          >
            <div className="flex h-4 w-4 items-center justify-center shrink-0">
              <FirefoxIcon size={16} />
            </div>
            <span>Firefox Add-ons (AMO)</span>
            <span className="rounded-sm bg-[#FF7139]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF7139]">
              Nativo AstroFox
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStoreType('chrome')}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              storeType === 'chrome'
                ? 'border-white/30 bg-white/10 text-white shadow-xs'
                : 'border-white/10 bg-[#14151B] text-[#8E92A2] hover:border-white/20 hover:text-white'
            }`}
          >
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-[#EA4335] via-[#FBBC05] to-[#34A853] p-0.5">
              <div className="h-full w-full rounded-full bg-[#161720]" />
            </div>
            <span>Chrome Web Store</span>
            <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
              Chromium
            </span>
          </button>
        </div>
      </div>

      {/* 2. URL da extensão */}
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <label className="text-right text-[12.5px] font-medium text-[#C8CBD4] select-none sm:col-span-3">
          <span className="mr-1 text-red-500">*</span> URL da extensão
        </label>
        <div className="sm:col-span-9">
          <input
            type="url"
            required
            placeholder={
              storeType === 'firefox'
                ? 'https://addons.mozilla.org/pt-BR/firefox/addon/nome-extensao/'
                : 'https://chromewebstore.google.com/detail/nome-extensao/id...'
            }
            value={values.url}
            onChange={(e) => onChange('url', e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#14151B] px-3.5 py-2.5 font-mono text-[12.5px] text-white placeholder-[#5C6070] transition-colors focus:border-white/40 focus:ring-1 focus:ring-white/15 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 3. Box de Notas e Instruções Contextuais */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-12">
        <div className="hidden sm:col-span-3 sm:block" />
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#14151B] p-4 text-xs leading-relaxed text-[#989BAA] sm:col-span-9">
          {storeType === 'firefox' ? (
            <div className="space-y-2">
              <span className="block font-semibold text-white">
                Nota (Firefox Add-ons - Mozilla AMO):
              </span>
              <ul className="space-y-1.5 pl-1">
                <li>
                  1. O motor <strong className="text-white">AstroFox</strong> executa extensões nativas do Firefox no formato <code className="rounded bg-[#20222D] px-1 py-0.5 text-[#FFA07A]">.xpi</code>.
                </li>
                <li>
                  2. Visite a{' '}
                  <a
                    href="https://addons.mozilla.org/pt-BR/firefox/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[#FF7139] underline underline-offset-2 hover:text-[#FFA07A]"
                  >
                    Firefox Add-ons (pt-BR)
                    <ExternalLink size={11} />
                  </a>
                  , navegue até a extensão desejada e copie o link da página.
                </li>
                <li>
                  3. Exemplo de link: <span className="font-mono text-[#D4D7E2]">https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/</span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="block font-semibold text-white">
                Nota (Chrome Web Store):
              </span>
              <ul className="space-y-1.5 pl-1">
                <li>
                  1. Utilize uma rede que possa acessar a Chrome Web Store para
                  adicionar a extensão.
                </li>
                <li>
                  2. Recomendado para perfis configurados com o motor <strong className="text-white">Chromium (SunBrowser)</strong>.
                </li>
                <li>
                  3. Visite a{' '}
                  <a
                    href="https://chromewebstore.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-emerald-400/80 underline underline-offset-2 hover:text-emerald-300"
                  >
                    Chrome Web Store
                    <ExternalLink size={11} />
                  </a>
                  , e copie o link da extensão que deseja adicionar.
                </li>
              </ul>
            </div>
          )}

          {/* Mockup visual dinâmico */}
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0C0D12] shadow-inner select-none">
            {/* Barra de URL do Navegador */}
            <div className="flex items-center gap-2 border-b border-white/10 bg-[#14151B] px-3 py-1.5">
              <div className="flex items-center gap-1.5 text-[#5C6070]">
                <ArrowLeft size={12} />
                <ArrowRight size={12} />
                <RotateCw size={11} />
              </div>
              <div className="flex flex-1 items-center gap-1.5 rounded-md border border-white/10 bg-[#08090C] px-2.5 py-1 font-mono text-[11px] text-[#A6ABB9]">
                <Lock size={10} className="shrink-0 text-emerald-400" />
                <span className="truncate">
                  {storeType === 'firefox'
                    ? 'addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/'
                    : 'chromewebstore.google.com/detail/volume-master/jghecgabfgfdldnmb...'}
                </span>
              </div>
            </div>

            {/* Cabeçalho da Loja correspondente */}
            {storeType === 'firefox' ? (
              <div className="flex items-center justify-between bg-[#13141B] px-4 py-2 text-[11.5px]">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#FF3B30] via-[#FF9500] to-[#AF52DE] p-1 shadow-xs">
                    <Flame size={12} className="text-white" />
                  </div>
                  <span className="font-semibold text-white">
                    Firefox Browser Add-ons
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#7E8294]">
                  <span>Explorar</span>
                  <span className="border-b-2 border-[#FF7139] font-semibold text-white">
                    Extensões
                  </span>
                  <span>Temas</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-[#13141B] px-4 py-2 text-[11.5px]">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-[#EA4335] via-[#FBBC05] to-[#34A853] p-1 shadow-xs">
                    <div className="h-full w-full rounded-full bg-white/90" />
                  </div>
                  <span className="font-semibold text-white">
                    chrome web store
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#7E8294]">
                  <span>Discover</span>
                  <span className="border-b-2 border-white font-semibold text-white">
                    Extensions
                  </span>
                  <span>Themes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdicionarExtensaoWeb;

