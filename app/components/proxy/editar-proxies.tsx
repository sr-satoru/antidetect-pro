import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronDown,
  Info,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { api } from '@/services/index.api';

interface EditarProxiesProps {
  proxy: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const EditarProxies: React.FC<EditarProxiesProps> = ({
  proxy,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState('socks5');
  const [ipChecker, setIpChecker] = useState('IP2Location');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [rotationLink, setRotationLink] = useState('');
  const [name, setName] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'active' | 'auth_error' | 'connection_error' | 'timeout' | 'error';
    text: string;
  }>({ status: 'idle', text: '' });

  useEffect(() => {
    if (proxy) {
      setType(proxy.type || 'socks5');
      setHost(proxy.host || '');
      setPort(proxy.port ? String(proxy.port) : '');
      setUser(proxy.user || proxy.username || '');
      setPass(proxy.pass || proxy.password || '');
      setRotationLink(proxy.rotationLink || proxy.rotation_url || '');
      setName(proxy.name || '');
      setTestResult({ status: 'idle', text: '' });
    }
  }, [proxy]);

  const handleTest = async () => {
    if (!host.trim() || !port.trim() || isTesting) return;

    setIsTesting(true);
    setTestResult({ status: 'idle', text: 'Testando...' });

    try {
      const res = await api.proxies.test({
        type,
        host: host.trim().replace(/^\[|\]$/g, ''),
        port: Number(port.trim()),
        username: user.trim() || undefined,
        password: pass.trim() || undefined,
      });

      if (res.status === 'active' || res.status === 'success') {
        const pingStr = res.latency_ms ? ` (${res.latency_ms}ms)` : '';
        setTestResult({
          status: 'active',
          text: `🟢 Conectado: ${res.exit_ip || host}${pingStr}`,
        });
      } else if (res.status === 'auth_error') {
        setTestResult({
          status: 'auth_error',
          text: '🔴 Erro de autenticação: credenciais inválidas',
        });
      } else if (res.status === 'timeout') {
        setTestResult({
          status: 'timeout',
          text: '🟡 Tempo limite esgotado',
        });
      } else if (res.status === 'connection_error') {
        setTestResult({
          status: 'connection_error',
          text: '🔴 Falha na conexão com host/porta',
        });
      } else {
        setTestResult({
          status: 'error',
          text: `🔴 ${res.message || 'Erro ao testar proxy'}`,
        });
      }
    } catch {
      setTestResult({
        status: 'error',
        text: '🔴 Erro ao testar conexão do proxy',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!host.trim() || !port.trim()) return;

    const updated = {
      ...proxy,
      name: name.trim() || `Proxy ${host.trim()}:${port.trim()}`,
      type,
      host: host.trim(),
      port: port.trim(),
      user: user.trim(),
      pass: pass.trim(),
      rotationLink: rotationLink.trim(),
      ip: host.trim().replace(/^\[|\]$/g, ''),
      lastChecked: new Date().toISOString().substring(5, 19).replace('T', ' '),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Popup Box */}
      <div className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-xl border border-[#323440] bg-[#222329] text-[#D1D5DB] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-[#2C2E38] px-6 select-none">
          <span className="text-sm font-semibold text-white">Editar proxy</span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-3.5 p-6">
          {/* Row 1: ID do agente */}
          <div className="grid grid-cols-12 items-center gap-3">
            <label className="col-span-4 text-right text-xs text-[#8E92A2] select-none">
              ID do agente
            </label>
            <div className="col-span-8">
              <span className="inline-flex items-center rounded bg-[#1677FF]/15 px-2 py-0.5 text-xs font-semibold text-[#1677FF]">
                {proxy?.id ?? 2}
              </span>
            </div>
          </div>

          {/* Row 2: Tipo de Proxy */}
          <div className="grid grid-cols-12 items-center gap-3">
            <label className="col-span-4 text-right text-xs text-[#8E92A2] select-none">
              <span className="mr-0.5 text-[#FF4D4F]">*</span> Tipo de Proxy
            </label>
            <div className="col-span-8">
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-md border border-[#323440] bg-[#18191E] px-3 py-1.5 pr-8 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
                >
                  <option value="socks5">Socks5</option>
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="ssh">SSH</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6C6F7E]"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Verificador de IP */}
          <div className="grid grid-cols-12 items-center gap-3">
            <label className="col-span-4 text-right text-xs text-[#8E92A2] select-none">
              Verificador de IP
            </label>
            <div className="col-span-8">
              <div className="relative">
                <select
                  value={ipChecker}
                  onChange={(e) => setIpChecker(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-md border border-[#323440] bg-[#18191E] px-3 py-1.5 pr-10 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
                >
                  <option value="IP2Location">IP2Location</option>
                  <option value="ip-api.com">ip-api.com</option>
                  <option value="ipinfo.io">ipinfo.io</option>
                </select>
                <div className="pointer-events-none absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1 text-[#6C6F7E]">
                  <Info size={13} />
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Host:Porto */}
          <div className="grid grid-cols-12 items-center gap-3">
            <label className="col-span-4 text-right text-xs text-[#8E92A2] select-none">
              <span className="mr-0.5 text-[#FF4D4F]">*</span> Host:Porto
            </label>
            <div className="col-span-8">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="Host"
                  className="min-w-0 flex-1 rounded-md border border-[#323440] bg-[#18191E] px-3 py-1.5 font-mono text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
                />
                <span className="font-semibold text-[#8E92A2]">:</span>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="Porta"
                  className="w-20 rounded-md border border-[#323440] bg-[#18191E] px-2.5 py-1.5 font-mono text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
                />
                <Info size={13} className="shrink-0 text-[#6C6F7E]" />
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || !host.trim() || !port.trim()}
                  className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-[#383A46] bg-[#1C1D23] px-2.5 py-1.5 text-xs text-[#A0A5B5] transition-colors hover:bg-[#282A33] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isTesting && <Loader2 size={12} className="animate-spin text-[#2F80ED]" />}
                  <span>Verificar proxy</span>
                </button>
              </div>

              {/* Status do teste se executado */}
              {testResult.text && (
                <div className="mt-1 text-[11px] font-mono">
                  {testResult.text}
                </div>
              )}
            </div>
          </div>

          {/* Row 5: Nome do utilizador do proxy */}
          <div className="grid grid-cols-12 items-center gap-3">
            <label className="col-span-4 text-right text-xs leading-snug text-[#8E92A2] select-none">
              Nome do utilizador<br />do proxy
            </label>
            <div className="col-span-8">
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Nome do utilizador do proxy"
                className="w-full rounded-md border border-[#323440] bg-[#18191E] px-3 py-1.5 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 6: Senha do Proxy */}
          <div className="grid grid-cols-12 items-center gap-3">
            <label className="col-span-4 text-right text-xs text-[#8E92A2] select-none">
              Senha do Proxy
            </label>
            <div className="col-span-8">
              <input
                type="text"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Senha do Proxy"
                className="w-full rounded-md border border-[#323440] bg-[#18191E] px-3 py-1.5 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 7: Mudar o URL IP */}
          <div className="grid grid-cols-12 items-center gap-3">
            <label className="col-span-4 text-right text-xs text-[#8E92A2] select-none">
              Mudar o URL IP
            </label>
            <div className="col-span-8">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={rotationLink}
                  onChange={(e) => setRotationLink(e.target.value)}
                  placeholder="Indique Alterar o URL IP"
                  className="w-full rounded-md border border-[#323440] bg-[#18191E] px-3 py-1.5 pr-14 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
                />
                <div className="absolute right-2.5 flex items-center gap-1.5 text-[#6C6F7E]">
                  <span title="Recarregar" className="cursor-pointer text-[#2F80ED] transition-transform hover:rotate-180">
                    <RotateCw size={13} />
                  </span>
                  <Info size={13} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 8: Nota */}
          <div className="grid grid-cols-12 items-center gap-3">
            <label className="col-span-4 text-right text-xs text-[#8E92A2] select-none">
              Nota
            </label>
            <div className="col-span-8">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Indique a observação"
                className="w-full rounded-md border border-[#323440] bg-[#18191E] px-3 py-1.5 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex h-14 shrink-0 items-center justify-start gap-3 border-t border-[#2C2E38] bg-[#1E1F24] px-6 select-none">
          <button
            type="button"
            onClick={handleSave}
            className="flex cursor-pointer items-center justify-center rounded-md bg-[#1677FF] px-6 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#4096FF] active:scale-[0.98]"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md px-4 py-1.5 text-xs font-medium text-[#8E92A2] transition-colors hover:bg-[#282932] hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarProxies;
