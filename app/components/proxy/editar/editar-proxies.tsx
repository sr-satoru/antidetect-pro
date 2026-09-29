import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Info, RotateCw, Loader2 } from 'lucide-react';
import { api } from '@/services/index.api';
import { formatProxyTestResult, FormattedTestResult } from '@/services/proxies/service.proxies';

interface EditarProxiesProps {
  proxy: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const inputCls =
  'w-full rounded-md border border-[#323440] bg-[#18191E] px-3 py-1.5 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden';

const FieldRow: React.FC<{
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div className="grid grid-cols-12 items-center gap-3">
    <label className="col-span-4 text-right text-xs leading-snug text-[#8E92A2] select-none">
      {required && <span className="mr-0.5 text-[#FF4D4F]">*</span>}
      {label}
    </label>
    <div className="col-span-8">{children}</div>
  </div>
);

export const EditarProxies: React.FC<EditarProxiesProps> = ({
  proxy,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState({
    type: 'socks5',
    ipChecker: 'IP2Location',
    host: '',
    port: '',
    user: '',
    pass: '',
    rotationLink: '',
    name: '',
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<FormattedTestResult>({
    status: 'idle',
    text: '',
  });

  useEffect(() => {
    if (proxy) {
      setForm({
        type: proxy.type || 'socks5',
        ipChecker: 'IP2Location',
        host: proxy.host || '',
        port: proxy.port ? String(proxy.port) : '',
        user: proxy.user || proxy.username || '',
        pass: proxy.pass || proxy.password || '',
        rotationLink: proxy.rotationLink || proxy.rotation_url || '',
        name: proxy.name || '',
      });
      setTestResult({ status: 'idle', text: '' });
    }
  }, [proxy]);

  const updateField = (field: string, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleTest = async () => {
    if (!form.host.trim() || !form.port.trim() || isTesting) return;

    setIsTesting(true);
    setTestResult({ status: 'idle', text: 'Testando...' });

    try {
      const res = await api.proxies.test({
        type: form.type,
        host: form.host.trim().replace(/^\[|\]$/g, ''),
        port: Number(form.port.trim()),
        username: form.user.trim() || undefined,
        password: form.pass.trim() || undefined,
      });

      setTestResult(formatProxyTestResult(res, form.host.trim(), { verbose: true }));
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
    if (!form.host.trim() || !form.port.trim()) return;

    const updated = {
      ...proxy,
      name: form.name.trim() || `Proxy ${form.host.trim()}:${form.port.trim()}`,
      type: form.type,
      host: form.host.trim(),
      port: form.port.trim(),
      user: form.user.trim(),
      pass: form.pass.trim(),
      rotationLink: form.rotationLink.trim(),
      ip: form.host.trim().replace(/^\[|\]$/g, ''),
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
          <FieldRow label="ID do agente">
            <span className="inline-flex items-center rounded bg-[#1677FF]/15 px-2 py-0.5 text-xs font-semibold text-[#1677FF]">
              {proxy?.id ?? 2}
            </span>
          </FieldRow>

          {/* Row 2: Tipo de Proxy */}
          <FieldRow label="Tipo de Proxy" required>
            <div className="relative">
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
                className={`${inputCls} cursor-pointer appearance-none pr-8`}
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
          </FieldRow>

          {/* Row 3: Verificador de IP */}
          <FieldRow label="Verificador de IP">
            <div className="relative">
              <select
                value={form.ipChecker}
                onChange={(e) => updateField('ipChecker', e.target.value)}
                className={`${inputCls} cursor-pointer appearance-none pr-10`}
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
          </FieldRow>

          {/* Row 4: Host:Porto */}
          <FieldRow label="Host:Porto" required>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={form.host}
                onChange={(e) => updateField('host', e.target.value)}
                placeholder="Host"
                className={`min-w-0 flex-1 font-mono ${inputCls}`}
              />
              <span className="font-semibold text-[#8E92A2]">:</span>
              <input
                type="text"
                value={form.port}
                onChange={(e) => updateField('port', e.target.value)}
                placeholder="Porta"
                className={`w-20 font-mono ${inputCls} px-2.5`}
              />
              <Info size={13} className="shrink-0 text-[#6C6F7E]" />
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !form.host.trim() || !form.port.trim()}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-[#383A46] bg-[#1C1D23] px-2.5 py-1.5 text-xs text-[#A0A5B5] transition-colors hover:bg-[#282A33] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isTesting && (
                  <Loader2 size={12} className="animate-spin text-[#2F80ED]" />
                )}
                <span>Verificar proxy</span>
              </button>
            </div>
            {testResult.text && (
              <div className="mt-1 font-mono text-[11px]">{testResult.text}</div>
            )}
          </FieldRow>

          {/* Row 5: Nome do utilizador do proxy */}
          <FieldRow label={<>Nome do utilizador<br />do proxy</>}>
            <input
              type="text"
              value={form.user}
              onChange={(e) => updateField('user', e.target.value)}
              placeholder="Nome do utilizador do proxy"
              className={inputCls}
            />
          </FieldRow>

          {/* Row 6: Senha do Proxy */}
          <FieldRow label="Senha do Proxy">
            <input
              type="text"
              value={form.pass}
              onChange={(e) => updateField('pass', e.target.value)}
              placeholder="Senha do Proxy"
              className={inputCls}
            />
          </FieldRow>

          {/* Row 7: Mudar o URL IP */}
          <FieldRow label="Mudar o URL IP">
            <div className="relative flex items-center">
              <input
                type="text"
                value={form.rotationLink}
                onChange={(e) => updateField('rotationLink', e.target.value)}
                placeholder="Indique Alterar o URL IP"
                className={`${inputCls} pr-14`}
              />
              <div className="absolute right-2.5 flex items-center gap-1.5 text-[#6C6F7E]">
                <span
                  title="Recarregar"
                  className="cursor-pointer text-[#2F80ED] transition-transform hover:rotate-180"
                >
                  <RotateCw size={13} />
                </span>
                <Info size={13} />
              </div>
            </div>
          </FieldRow>

          {/* Row 8: Nota */}
          <FieldRow label="Nota">
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Indique a observação"
              className={inputCls}
            />
          </FieldRow>
        </div>

        {/* Footer */}
        <div className="flex h-14 shrink-0 items-center justify-start gap-3 border-t border-[#2C2E38] bg-[#1E1F24] px-6 select-none">
          <button
            type="button"
            onClick={handleSave}
            className="flex cursor-pointer items-center justify-center rounded-md bg-[#1C1D24] border border-white/30 hover:border-white px-6 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#252834] active:scale-[0.98]"
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
