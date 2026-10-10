import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Shield,
  Globe,
  Lock,
  Smartphone,
  RefreshCw,
} from 'lucide-react';

export interface ProxyFormValues {
  name: string;
  type: string;
  host: string;
  port: string;
  user: string;
  pass: string;
  rotationLink: string;
}

interface FormularioCamposProxyProps {
  values: ProxyFormValues;
  onChange: (field: keyof ProxyFormValues, value: string) => void;
}

const PROTOCOLS = [
  {
    id: 'socks5',
    label: 'SOCKS5',
    badge: 'TCP / UDP',
    desc: 'Proxy SOCKS5 padrão',
    icon: Shield,
    infoText:
      'Configuração exclusiva SOCKS5 (Conexão direta TCP & UDP, sem rotação de IP).',
    hostLabel: 'Host SOCKS5 (IP ou Domínio)',
    userPlaceholder: 'usuario_socks5',
    defaultPort: '1080',
  },
  {
    id: 'http',
    label: 'HTTP',
    badge: 'Web',
    desc: 'Proxy web convencional',
    icon: Globe,
    infoText:
      'Configuração exclusiva HTTP (Proxy convencional para tráfego web padrão).',
    hostLabel: 'Host HTTP (IP ou Domínio)',
    userPlaceholder: 'usuario_http',
    defaultPort: '8080',
  },
  {
    id: 'https',
    label: 'HTTPS',
    badge: 'SSL/TLS',
    desc: 'Túnel criptografado',
    icon: Lock,
    infoText:
      'Configuração exclusiva HTTPS (Túnel criptografado SSL/TLS com alta segurança).',
    hostLabel: 'Host HTTPS (IP ou Domínio)',
    userPlaceholder: 'usuario_https',
    defaultPort: '8443',
  },
  {
    id: 'mobile',
    label: 'Proxy Móvel',
    badge: '4G / 5G',
    desc: 'Com rotação de IP',
    icon: Smartphone,
    infoText:
      'Configuração exclusiva Proxy Móvel 4G / 5G com Rotação Dinâmica de IP.',
    hostLabel: 'Host do Proxy Móvel (IP ou Domínio)',
    userPlaceholder: 'usuario_movel',
    defaultPort: '9000',
  },
];

export const FormularioCamposProxy: React.FC<FormularioCamposProxyProps> = ({
  values,
  onChange,
}) => {
  const [showPass, setShowPass] = useState(false);

  const activeProto =
    PROTOCOLS.find((p) => p.id === values.type) || PROTOCOLS[0];
  const ProtoIcon = activeProto.icon;

  return (
    <div className="space-y-6">
      {/* 1. Grade de Seleção de Tipo de Proxy */}
      <div>
        <label className="mb-2 block text-[12.5px] font-semibold text-slate-700 dark:text-[#C8CBD4] select-none">
          Tipo de Proxy
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PROTOCOLS.map((p) => {
            const isSelected = values.type === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange('type', p.id)}
                className={`cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800 dark:border-white/30 dark:bg-white/10 dark:text-white shadow-xs'
                    : 'border-slate-200 bg-white dark:border-white/10 dark:bg-[#181920] text-slate-600 dark:text-[#8E92A2] hover:border-slate-300 hover:text-slate-900 dark:hover:border-white/20 dark:hover:text-white shadow-xs'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="block text-[13px] font-bold text-slate-900 dark:text-white">
                    {p.label}
                  </span>
                  <Icon
                    size={15}
                    className={
                      isSelected
                        ? 'text-emerald-600 dark:text-[#00FF66]'
                        : 'text-slate-400 dark:text-[#6E7282]'
                    }
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-slate-700 dark:text-[#C8CBD4] uppercase">
                    {p.badge}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500 dark:text-[#8E92A2]">
                    {p.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Painel de Configurações do Protocolo Ativo */}
      <div className="space-y-5 animate-in fade-in duration-150">
        {/* Banner Informativo */}
        <div
          className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs ${
            values.type === 'mobile'
              ? 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-400'
              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] text-slate-700 dark:text-[#C8CBD4]'
          }`}
        >
          <ProtoIcon size={14} className="shrink-0 opacity-80" />
          <span>{activeProto.infoText}</span>
        </div>

        {/* Nome / Identificador */}
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-[#C8CBD4] select-none">
            Nome / Identificador do Proxy{' '}
            <span className="text-[11px] font-normal text-slate-400 dark:text-[#787D90]">
              (Opcional)
            </span>
          </label>
          <input
            type="text"
            placeholder={`Ex: ${activeProto.label} Residencial SP 01, Datacenter US`}
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#181920] px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-hidden shadow-xs"
          />
        </div>

        {/* Host e Porta */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-3">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-[#C8CBD4] select-none">
              {activeProto.hostLabel}{' '}
              <span className="font-bold text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="192.168.1.1 ou proxy.exemplo.com"
              value={values.host}
              onChange={(e) => onChange('host', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-hidden shadow-xs"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-[#C8CBD4] select-none">
              Porta <span className="font-bold text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={activeProto.defaultPort}
              value={values.port}
              onChange={(e) =>
                onChange('port', e.target.value.replace(/\D/g, ''))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#181920] px-3 py-2.5 text-center font-mono text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-hidden shadow-xs"
            />
          </div>
        </div>

        {/* Autenticação */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-[#C8CBD4] select-none">
              Usuário {activeProto.label}{' '}
              <span className="text-[11px] font-normal text-slate-400 dark:text-[#787D90]">
                (Opcional)
              </span>
            </label>
            <input
              type="text"
              placeholder={activeProto.userPlaceholder}
              value={values.user}
              onChange={(e) => onChange('user', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-hidden shadow-xs"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-[#C8CBD4] select-none">
              Senha {activeProto.label}{' '}
              <span className="text-[11px] font-normal text-slate-400 dark:text-[#787D90]">
                (Opcional)
              </span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={values.pass}
                onChange={(e) => onChange('pass', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#181920] px-3.5 py-2.5 pr-10 font-mono text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-hidden shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700 dark:text-[#7E8294] dark:hover:text-white transition-colors"
                title={showPass ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Campo Exclusivo: Link de Rotação de IP (apenas para Móvel) */}
        {values.type === 'mobile' && (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] p-4.5 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-[12.5px] font-bold text-slate-900 dark:text-white select-none">
                <RefreshCw size={14} className="text-emerald-600 dark:text-[#00FF66]" />
                <span>Link de Rotação de IP (Webhook / URL de Troca)</span>
              </label>
              <span className="rounded bg-emerald-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-white uppercase">
                Exclusivo Móvel
              </span>
            </div>
            <input
              type="url"
              placeholder="https://api.proxymobile.net/change-ip?key=seutoken123"
              value={values.rotationLink}
              onChange={(e) => onChange('rotationLink', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#181920] px-3.5 py-2.5 font-mono text-[12.5px] text-emerald-600 dark:text-[#00FF66] placeholder-slate-400 dark:placeholder-[#5C6070] transition-colors focus:border-emerald-500 dark:focus:border-white/40 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/10 focus:outline-hidden shadow-xs"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-[#9EA2AE]">
              Insira a URL que o modem móvel ou fornecedor de 4G/5G disponibiliza para resetar a conexão e obter um novo IP público.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormularioCamposProxy;
