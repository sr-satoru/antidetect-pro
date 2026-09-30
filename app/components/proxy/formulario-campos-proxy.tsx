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
    accent: '#2F80ED',
  },
  {
    id: 'http',
    label: 'HTTP',
    badge: 'Web',
    desc: 'Proxy web convencional',
    icon: Globe,
    accent: '#A3E635',
  },
  {
    id: 'https',
    label: 'HTTPS',
    badge: 'SSL/TLS',
    desc: 'Túnel criptografado',
    icon: Lock,
    accent: '#10B981',
  },
  {
    id: 'mobile',
    label: 'Proxy Móvel',
    badge: '4G / 5G',
    desc: 'Com rotação de IP',
    icon: Smartphone,
    accent: '#00FF66',
  },
];

export const FormularioCamposProxy: React.FC<FormularioCamposProxyProps> = ({
  values,
  onChange,
}) => {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. Grade de Seleção de Tipo de Proxy */}
      <div>
        <label className="mb-2 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
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
                    ? 'border-[#2F80ED] bg-[#1D2B44] text-white shadow-xs ring-1 ring-[#2F80ED]/30'
                    : 'border-[#363847] bg-[#181920] text-[#8E92A2] hover:border-[#4B4E61] hover:text-white'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="block text-[13px] font-bold text-white">
                    {p.label}
                  </span>
                  <Icon
                    size={15}
                    style={{ color: isSelected ? '#00FF66' : '#6E7282' }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-[#282935] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#C8CBD4] uppercase">
                    {p.badge}
                  </span>
                  <span className="block truncate text-[11px] text-[#8E92A2]">
                    {p.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Painéis Específicos para cada seleção */}

      {/* =========================================
          PAINEL EXCLUSIVO: SOCKS5 (SEM ROTAÇÃO)
          ========================================= */}
      {values.type === 'socks5' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 rounded-lg border border-[#2F80ED]/25 bg-[#17253D] px-3.5 py-2 text-xs text-[#8DBBFF]">
            <Shield size={14} className="shrink-0 text-[#2F80ED]" />
            <span>
              Configuração exclusiva <strong>SOCKS5</strong> (Conexão direta TCP & UDP, sem rotação de IP).
            </span>
          </div>

          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
              Nome / Identificador do Proxy{' '}
              <span className="text-[11px] font-normal text-[#787D90]">
                (Opcional)
              </span>
            </label>
            <input
              type="text"
              placeholder="Ex: SOCKS5 Residencial SP 01, Datacenter US"
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
            />
          </div>

          {/* Host e Porta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Host SOCKS5 (IP ou Domínio){' '}
                <span className="font-bold text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="192.168.1.1 ou socks.exemplo.com"
                value={values.host}
                onChange={(e) => onChange('host', e.target.value)}
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Porta <span className="font-bold text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="1080"
                value={values.port}
                onChange={(e) =>
                  onChange('port', e.target.value.replace(/\D/g, ''))
                }
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3 py-2.5 text-center font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Autenticação SOCKS5 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Usuário SOCKS5{' '}
                <span className="text-[11px] font-normal text-[#787D90]">
                  (Opcional)
                </span>
              </label>
              <input
                type="text"
                placeholder="usuario_socks5"
                value={values.user}
                onChange={(e) => onChange('user', e.target.value)}
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Senha SOCKS5{' '}
                <span className="text-[11px] font-normal text-[#787D90]">
                  (Opcional)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={values.pass}
                  onChange={(e) => onChange('pass', e.target.value)}
                  className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 pr-10 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#7E8294] transition-colors hover:text-white"
                  title={showPass ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          PAINEL EXCLUSIVO: HTTP (SEM ROTAÇÃO)
          ========================================= */}
      {values.type === 'http' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 rounded-lg border border-[#A3E635]/25 bg-[#202715] px-3.5 py-2 text-xs text-[#C5F277]">
            <Globe size={14} className="shrink-0 text-[#A3E635]" />
            <span>
              Configuração exclusiva <strong>HTTP</strong> (Proxy convencional para tráfego web padrão).
            </span>
          </div>

          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
              Nome / Identificador do Proxy{' '}
              <span className="text-[11px] font-normal text-[#787D90]">
                (Opcional)
              </span>
            </label>
            <input
              type="text"
              placeholder="Ex: Datacenter Ashburn HTTP 01"
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
            />
          </div>

          {/* Host e Porta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Host HTTP (IP ou Domínio){' '}
                <span className="font-bold text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="192.168.1.1 ou proxy-http.exemplo.com"
                value={values.host}
                onChange={(e) => onChange('host', e.target.value)}
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Porta <span className="font-bold text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="8080"
                value={values.port}
                onChange={(e) =>
                  onChange('port', e.target.value.replace(/\D/g, ''))
                }
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3 py-2.5 text-center font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Autenticação HTTP */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Usuário HTTP{' '}
                <span className="text-[11px] font-normal text-[#787D90]">
                  (Opcional)
                </span>
              </label>
              <input
                type="text"
                placeholder="usuario_http"
                value={values.user}
                onChange={(e) => onChange('user', e.target.value)}
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Senha HTTP{' '}
                <span className="text-[11px] font-normal text-[#787D90]">
                  (Opcional)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={values.pass}
                  onChange={(e) => onChange('pass', e.target.value)}
                  className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 pr-10 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#7E8294] transition-colors hover:text-white"
                  title={showPass ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          PAINEL EXCLUSIVO: HTTPS (SEM ROTAÇÃO)
          ========================================= */}
      {values.type === 'https' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 rounded-lg border border-[#10B981]/25 bg-[#142820] px-3.5 py-2 text-xs text-[#8CE3C3]">
            <Lock size={14} className="shrink-0 text-[#10B981]" />
            <span>
              Configuração exclusiva <strong>HTTPS</strong> (Túnel criptografado via TLS/SSL ponto-a-ponto).
            </span>
          </div>

          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
              Nome / Identificador do Proxy{' '}
              <span className="text-[11px] font-normal text-[#787D90]">
                (Opcional)
              </span>
            </label>
            <input
              type="text"
              placeholder="Ex: Gateway Seguro Frankfurt HTTPS"
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
            />
          </div>

          {/* Host e Porta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Host HTTPS (Domínio TLS ou IP){' '}
                <span className="font-bold text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="proxy.secure-domain.com"
                value={values.host}
                onChange={(e) => onChange('host', e.target.value)}
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Porta <span className="font-bold text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="443"
                value={values.port}
                onChange={(e) =>
                  onChange('port', e.target.value.replace(/\D/g, ''))
                }
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3 py-2.5 text-center font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Autenticação HTTPS */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Usuário HTTPS{' '}
                <span className="text-[11px] font-normal text-[#787D90]">
                  (Opcional)
                </span>
              </label>
              <input
                type="text"
                placeholder="usuario_https"
                value={values.user}
                onChange={(e) => onChange('user', e.target.value)}
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Senha HTTPS{' '}
                <span className="text-[11px] font-normal text-[#787D90]">
                  (Opcional)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={values.pass}
                  onChange={(e) => onChange('pass', e.target.value)}
                  className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 pr-10 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#7E8294] transition-colors hover:text-white"
                  title={showPass ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PAINEL EXCLUSIVO: PROXY MÓVEL (COM LINK DE ROTAÇÃO DE IP)
          ======================================================== */}
      {(values.type === 'mobile' || values.type === 'movel') && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 rounded-lg border border-[#00FF66]/30 bg-[#122A1E] px-3.5 py-2 text-xs text-[#00FF66]">
            <Smartphone size={14} className="shrink-0 text-[#00FF66]" />
            <span>
              Configuração exclusiva de <strong>Proxy Móvel 4G/5G</strong> (Dedicado a modems móveis com link de troca de IP).
            </span>
          </div>

          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
              Nome do Proxy Móvel{' '}
              <span className="text-[11px] font-normal text-[#787D90]">
                (Opcional)
              </span>
            </label>
            <input
              type="text"
              placeholder="Ex: Móvel Claro 4G Rotativo, Vivo 5G SP"
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
            />
          </div>

          {/* Host e Porta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Host / IP do Modem 4G/5G{' '}
                <span className="font-bold text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="177.18.29.102 ou proxy-movel.net"
                value={values.host}
                onChange={(e) => onChange('host', e.target.value)}
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Porta <span className="font-bold text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="1080"
                value={values.port}
                onChange={(e) =>
                  onChange('port', e.target.value.replace(/\D/g, ''))
                }
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3 py-2.5 text-center font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Usuário e Senha */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Usuário do Proxy Móvel{' '}
                <span className="text-[11px] font-normal text-[#787D90]">
                  (Opcional)
                </span>
              </label>
              <input
                type="text"
                placeholder="mobile_user"
                value={values.user}
                onChange={(e) => onChange('user', e.target.value)}
                className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[#C8CBD4] select-none">
                Senha{' '}
                <span className="text-[11px] font-normal text-[#787D90]">
                  (Opcional)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={values.pass}
                  onChange={(e) => onChange('pass', e.target.value)}
                  className="w-full rounded-lg border border-[#363847] bg-[#181920] px-3.5 py-2.5 pr-10 font-mono text-[13px] text-white placeholder-[#5C6070] transition-colors focus:border-[#2F80ED] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#7E8294] transition-colors hover:text-white"
                  title={showPass ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Campo Principal e Exclusivo: Link de Rotação de IP */}
          <div className="rounded-xl border border-[#00FF66]/30 bg-[#17181D] p-4.5 ring-1 ring-[#00FF66]/10">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-[12.5px] font-bold text-white select-none">
                <RefreshCw size={14} className="text-[#00FF66]" />
                <span>Link de Rotação de IP (Webhook / URL de Troca)</span>
              </label>
              <span className="rounded bg-[#00FF66]/15 px-2 py-0.5 text-[10px] font-bold text-[#00FF66] uppercase">
                Exclusivo Móvel
              </span>
            </div>
            <input
              type="url"
              placeholder="https://api.proxymobile.net/change-ip?key=seutoken123"
              value={values.rotationLink}
              onChange={(e) => onChange('rotationLink', e.target.value)}
              className="w-full rounded-lg border border-[#3E4152] bg-[#111216] px-3.5 py-2.5 font-mono text-[12.5px] text-[#00FF66] placeholder-[#5C6070] transition-colors focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-hidden"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-[#9EA2AE]">
              Insira a URL que o modem móvel ou fornecedor de 4G/5G disponibiliza para resetar a conexão e obter um novo IP público.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioCamposProxy;
