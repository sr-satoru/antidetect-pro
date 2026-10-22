import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Shield,
  Globe,
  Lock,
  Smartphone,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { api } from '@/services/index.api';
import { formatProxyTestResult, FormattedTestResult } from '@/services/proxies/service.proxies';

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
  onTestedSuccess?: (info: { ping?: number; exitIp?: string }) => void;
}

const PROTOCOLS = [
  {
    id: 'socks5',
    label: 'SOCKS5',
    badge: 'TCP / UDP',
    desc: 'Proxy SOCKS5 padrão',
    icon: Shield,
    infoText:
      'Configuração recomendada SOCKS5 (Conexão direta TCP & UDP sem vazamento de DNS).',
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
      'Configuração convencional HTTP (Proxy para navegação padrão).',
    hostLabel: 'Host HTTP (IP ou Domínio)',
    userPlaceholder: 'usuario_http',
    defaultPort: '8080',
  },
  {
    id: 'https',
    label: 'HTTPS',
    badge: 'SSL / TLS',
    desc: 'Túnel criptografado',
    icon: Lock,
    infoText:
      'Configuração exclusiva HTTPS (Túnel criptografado SSL/TLS com alta integridade).',
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
      'Configuração Proxy Móvel 4G / 5G com Suporte a Link de Rotação de IP Dinâmico.',
    hostLabel: 'Host do Proxy Móvel (IP ou Domínio)',
    userPlaceholder: 'usuario_movel',
    defaultPort: '9000',
  },
];

export const FormularioCamposProxy: React.FC<FormularioCamposProxyProps> = ({
  values,
  onChange,
  onTestedSuccess,
}) => {
  const [showPass, setShowPass] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<FormattedTestResult | null>(null);

  const activeProto =
    PROTOCOLS.find((p) => p.id === values.type) || PROTOCOLS[0];
  const ProtoIcon = activeProto.icon;

  const handleTestConnection = async () => {
    if (!values.host.trim() || !values.port.trim() || isTesting) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.proxies.test({
        type: values.type,
        host: values.host.trim().replace(/^\[|\]$/g, ''),
        port: Number(values.port.trim()),
        username: values.user.trim() || undefined,
        password: values.pass.trim() || undefined,
      });

      const formatted = formatProxyTestResult(res, values.host.trim(), { verbose: true });
      setTestResult(formatted);

      if (formatted.status === 'active' && onTestedSuccess) {
        onTestedSuccess({
          ping: formatted.latencyMs ?? undefined,
          exitIp: formatted.exitIp ?? undefined,
        });
      }
    } catch {
      setTestResult({
        status: 'error',
        text: 'Erro ao conectar ao proxy. Verifique o host, porta e credenciais.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Grade de Seleção de Tipo de Protocolo */}
      <div>
        <Label className="mb-2 block text-xs font-semibold">
          Tipo de Protocolo
        </Label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PROTOCOLS.map((p) => {
            const isSelected = values.type === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange('type', p.id);
                  if (!values.port || values.port === activeProto.defaultPort) {
                    onChange('port', p.defaultPort);
                  }
                }}
                className={`cursor-pointer rounded-xl border p-3 text-left transition-all select-none ${
                  isSelected
                    ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-slate-900 dark:border-[#A78BFA] dark:bg-[#7C3AED]/20 dark:text-white shadow-xs ring-1 ring-[#7C3AED]/30'
                    : 'border-slate-200 bg-white dark:border-white/10 dark:bg-[#181920] text-slate-600 dark:text-[#8E92A2] hover:border-slate-300 hover:text-slate-900 dark:hover:border-white/20 dark:hover:text-white'
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    {p.label}
                  </span>
                  <Icon
                    size={14}
                    className={
                      isSelected
                        ? 'text-[#7C3AED] dark:text-[#A78BFA]'
                        : 'text-slate-400 dark:text-[#6E7282]'
                    }
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={isSelected ? 'success' : 'secondary'}
                    className="px-1.5 py-0 text-[9px] uppercase font-mono"
                  >
                    {p.badge}
                  </Badge>
                  <span className="block truncate text-[10.5px] text-slate-500 dark:text-[#8E92A2]">
                    {p.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Banner Informativo do Protocolo */}
      <div
        className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs ${
          values.type === 'mobile'
            ? 'border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400'
            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] text-slate-600 dark:text-[#C8CBD4]'
        }`}
      >
        <ProtoIcon size={14} className="shrink-0 opacity-80" />
        <span>{activeProto.infoText}</span>
      </div>

      {/* 3. Nome / Identificador Opcional */}
      <div>
        <Label htmlFor="proxy-name" className="mb-1.5 block">
          Nome / Identificador do Proxy{' '}
          <span className="text-[11px] font-normal text-slate-400 dark:text-[#787D90]">
            (Opcional)
          </span>
        </Label>
        <Input
          id="proxy-name"
          type="text"
          placeholder={`Ex: ${activeProto.label} Residencial SP 01, Datacenter US`}
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
        />
      </div>

      {/* 4. Host e Porta */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-3">
          <Label htmlFor="proxy-host" className="mb-1.5 block">
            {activeProto.hostLabel} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="proxy-host"
            type="text"
            required
            placeholder="192.168.1.1 ou proxy.exemplo.com"
            value={values.host}
            onChange={(e) => onChange('host', e.target.value)}
            className="font-mono"
          />
        </div>
        <div>
          <Label htmlFor="proxy-port" className="mb-1.5 block">
            Porta <span className="text-red-500">*</span>
          </Label>
          <Input
            id="proxy-port"
            type="text"
            required
            placeholder={activeProto.defaultPort}
            value={values.port}
            onChange={(e) =>
              onChange('port', e.target.value.replace(/\D/g, ''))
            }
            className="font-mono text-center"
          />
        </div>
      </div>

      {/* 5. Autenticação (Usuário e Senha) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="proxy-user" className="mb-1.5 block">
            Usuário {activeProto.label}{' '}
            <span className="text-[11px] font-normal text-slate-400 dark:text-[#787D90]">
              (Opcional)
            </span>
          </Label>
          <Input
            id="proxy-user"
            type="text"
            placeholder={activeProto.userPlaceholder}
            value={values.user}
            onChange={(e) => onChange('user', e.target.value)}
            className="font-mono"
          />
        </div>
        <div>
          <Label htmlFor="proxy-pass" className="mb-1.5 block">
            Senha {activeProto.label}{' '}
            <span className="text-[11px] font-normal text-slate-400 dark:text-[#787D90]">
              (Opcional)
            </span>
          </Label>
          <Input
            id="proxy-pass"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            value={values.pass}
            onChange={(e) => onChange('pass', e.target.value)}
            className="font-mono"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="cursor-pointer text-slate-400 hover:text-slate-700 dark:text-[#7E8294] dark:hover:text-white transition-colors p-1"
                title={showPass ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
        </div>
      </div>

      {/* 6. Link de Rotação para Móvel */}
      {values.type === 'mobile' && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] p-4 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <Label className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <RefreshCw size={13} className="text-[#7C3AED] dark:text-[#A78BFA]" />
              <span>Link de Rotação de IP (Webhook / URL de Troca)</span>
            </Label>
            <Badge variant="success" className="text-[10px] font-bold">
              Exclusivo Móvel
            </Badge>
          </div>
          <Input
            type="url"
            placeholder="https://api.proxymobile.net/change-ip?key=seutoken123"
            value={values.rotationLink}
            onChange={(e) => onChange('rotationLink', e.target.value)}
            className="font-mono text-[#7C3AED] dark:text-[#A78BFA]"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-[#9EA2AE]">
            Insira a URL que o modem móvel ou provedor 4G/5G disponibiliza para forçar a rotação para um novo IP público.
          </p>
        </div>
      )}

      {/* 7. Ação de Testar Conexão Rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#14151B]/70 p-3">
        <div className="flex items-center gap-2 text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={!values.host.trim() || !values.port.trim() || isTesting}
            className="gap-1.5 border-slate-300 dark:border-[#353744]"
          >
            {isTesting ? (
              <Loader2 size={13} className="animate-spin text-[#7C3AED] dark:text-[#A78BFA]" />
            ) : (
              <RefreshCw size={13} />
            )}
            <span>Testar Conexão Agora</span>
          </Button>

          {testResult && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {testResult.status === 'active' ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 size={14} />
                  <span>{testResult.text}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                  <XCircle size={14} />
                  <span>{testResult.text}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <span className="text-[11px] text-slate-400 dark:text-[#787D90]">
          * Host e Porta são obrigatórios
        </span>
      </div>
    </div>
  );
};

export default FormularioCamposProxy;
