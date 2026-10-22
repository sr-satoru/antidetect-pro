import React from 'react';
import { ShieldAlert, Radio, Clock, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export interface NetworkSettings {
  enforceProxyCheck: boolean;
  dnsProvider: string;
  proxyTimeout: number;
}

export interface RedeTabProps {
  settings: NetworkSettings;
  onChange: (settings: NetworkSettings) => void;
}

export const RedeTab: React.FC<RedeTabProps> = ({ settings, onChange }) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 focus-visible:outline-none">
      {/* Kill Switch Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-6 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 shrink-0 mt-0.5">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Kill-Switch de Proteção de Conexão
                </h4>
                <span className="rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.2 text-[10px] font-bold text-red-500 uppercase">
                  Blindagem
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-1 leading-relaxed">
                Se o proxy falhar ou perder conexão, impede que o navegador inicie ou faça requisições diretas, eliminando qualquer risco de vazamento do seu IP residencial verdadeiro.
              </p>
            </div>
          </div>

          <Switch
            checked={settings.enforceProxyCheck}
            onCheckedChange={(val) =>
              onChange({ ...settings, enforceProxyCheck: val })
            }
          />
        </div>
      </div>

      {/* DNS Seguro (DoH) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-6 space-y-4 shadow-xs">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio size={16} className="text-slate-400 dark:text-[#9DA2B4]" />
            <span>Provedor de DNS Seguro (DNS-over-HTTPS)</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-0.5">
            Criptografa consultas de nomes de domínio, protegendo contra interceptações e DNS Leaks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'cloudflare', title: 'Cloudflare', sub: '1.1.1.1 • Zero Logs' },
            { id: 'google', title: 'Google Public DNS', sub: '8.8.8.8 • Global' },
            { id: 'proxy', title: 'DNS do Próprio Proxy', sub: 'Resolução no Host Remoto' },
          ].map((dns) => {
            const isSelected = settings.dnsProvider === dns.id;
            return (
              <div
                key={dns.id}
                onClick={() => onChange({ ...settings, dnsProvider: dns.id })}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-[#7C3AED] dark:border-[#A78BFA] bg-violet-50/20 dark:bg-[#7C3AED]/10 ring-2 ring-[#7C3AED]/25 shadow-xs'
                    : 'border-slate-200/80 dark:border-[#2D3039] bg-slate-50/50 dark:bg-[#1F2026] hover:border-slate-300 dark:hover:border-[#4B5063]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    {dns.title}
                  </span>
                  {isSelected && (
                    <Check
                      size={14}
                      className="text-[#7C3AED] dark:text-[#A78BFA]"
                      strokeWidth={2.5}
                    />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-[#9DA2B4]">
                  {dns.sub}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tempo Limite de Latência */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-6 space-y-4 shadow-xs">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={16} className="text-slate-400 dark:text-[#9DA2B4]" />
            <span>Tempo Limite de Teste (Timeout)</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-0.5">
            Janela máxima de espera para validação de conectividade antes de declarar o proxy offline.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { sec: 5, label: '5 segundos', desc: 'Conexões rápidas' },
            { sec: 10, label: '10 segundos', desc: 'Recomendado' },
            { sec: 15, label: '15 segundos', desc: 'Proxies residenciais lentos' },
          ].map((item) => {
            const isSelected = settings.proxyTimeout === item.sec;
            return (
              <button
                key={item.sec}
                type="button"
                onClick={() => onChange({ ...settings, proxyTimeout: item.sec })}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#7C3AED] dark:border-[#A78BFA] bg-violet-50/20 dark:bg-[#7C3AED]/10 ring-2 ring-[#7C3AED]/25 shadow-xs'
                    : 'border-slate-200/80 dark:border-[#2D3039] bg-slate-50/50 dark:bg-[#1F2026] hover:border-slate-300 dark:hover:border-[#4B5063]'
                }`}
              >
                <span className="block font-semibold text-xs text-slate-900 dark:text-white">
                  {item.label}
                </span>
                <span className="text-[10.5px] text-slate-400 dark:text-[#9DA2B4] mt-0.5 block">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
