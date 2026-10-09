import React, { useState, useEffect } from 'react';
import { ChevronDown, Info, RotateCw, Loader2 } from 'lucide-react';
import { api } from '@/services/index.api';
import { formatProxyTestResult, FormattedTestResult } from '@/services/proxies/service.proxies';

interface EditarProxiesProps {
  proxy: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const baseInputCls =
  'h-10 rounded-xl border border-slate-300 dark:border-[#363948] bg-white dark:bg-[#14151C] px-4 text-sm text-slate-900 dark:text-[#F0F2F8] placeholder-slate-400 dark:placeholder-[#5E6274] transition-all hover:border-slate-400 dark:hover:border-[#4B5065] focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-hidden shadow-xs';

const inputCls = `w-full ${baseInputCls}`;

const FieldRow: React.FC<{
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div className="flex items-center gap-4">
    <label className="w-44 shrink-0 text-right text-sm font-medium text-slate-600 dark:text-[#A6ABB8] select-none leading-normal">
      {required && <span className="mr-1 text-[#FF4D4F] font-bold">*</span>}
      {label}
    </label>
    <div className="flex-1 min-w-0">{children}</div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/85 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Popup Box - Sem cabeçalho e sem botão X (fechamento via Cancelar) */}
      <div className="relative z-10 w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 dark:border-[#343644] bg-white dark:bg-[#1C1E26] text-slate-800 dark:text-[#E0E2EC] shadow-2xl shadow-slate-900/10 dark:shadow-black/95 animate-in fade-in zoom-in-95 duration-150">
        {/* Form Body - Letras aumentadas, campos mais altos e confortáveis */}
        <div className="space-y-5 p-8">
          {/* Row 1: ID do agente */}
          <FieldRow label="ID do Agente">
            <span className="inline-flex items-center rounded-lg bg-blue-50 dark:bg-[#1677FF]/15 border border-blue-200 dark:border-[#1677FF]/35 px-3 py-1.5 text-xs font-mono font-semibold text-blue-600 dark:text-[#4096FF]">
              {proxy?.id ?? 2}
            </span>
          </FieldRow>

          {/* Row 2: Tipo de Proxy */}
          <FieldRow label="Tipo de Proxy" required>
            <div className="relative">
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
                className={`${inputCls} cursor-pointer appearance-none pr-10 text-sm font-medium`}
              >
                <option value="socks5">Socks5</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="ssh">SSH</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400 dark:text-[#7C8092]"
              />
            </div>
          </FieldRow>

          {/* Row 3: Verificador de IP */}
          <FieldRow label="Verificador de IP">
            <div className="relative">
              <select
                value={form.ipChecker}
                onChange={(e) => updateField('ipChecker', e.target.value)}
                className={`${inputCls} cursor-pointer appearance-none pr-12 text-sm font-medium`}
              >
                <option value="IP2Location">IP2Location</option>
                <option value="ip-api.com">ip-api.com</option>
                <option value="ipinfo.io">ipinfo.io</option>
              </select>
              <div className="pointer-events-none absolute top-1/2 right-3.5 flex -translate-y-1/2 items-center gap-1.5 text-slate-400 dark:text-[#7C8092]">
                <Info size={15} />
                <ChevronDown size={16} />
              </div>
            </div>
          </FieldRow>

          {/* Row 4: Host : Porta */}
          <FieldRow label="Host : Porta" required>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={form.host}
                onChange={(e) => updateField('host', e.target.value)}
                placeholder="Ex: 192.168.1.1 ou proxy.exemplo.com"
                className={`flex-1 min-w-[220px] font-mono text-sm ${baseInputCls}`}
              />
              <span className="font-bold text-slate-400 dark:text-[#8E92A2] select-none text-base">:</span>
              <input
                type="text"
                value={form.port}
                onChange={(e) => updateField('port', e.target.value)}
                placeholder="Porta"
                className={`w-32 shrink-0 font-mono text-center text-sm ${baseInputCls}`}
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !form.host.trim() || !form.port.trim()}
                className="h-10 flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 dark:border-[#3C3F4F] bg-slate-50 dark:bg-[#161720] px-4 text-xs font-semibold text-emerald-600 dark:text-[#00FF66] transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:hover:border-[#00FF66]/50 dark:hover:bg-[#00FF66]/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-50 dark:disabled:hover:bg-[#161720] disabled:text-slate-400 dark:disabled:text-[#7C8092] active:scale-[0.98] shadow-xs"
              >
                {isTesting ? (
                  <Loader2 size={14} className="animate-spin text-emerald-600 dark:text-[#00FF66]" />
                ) : (
                  <RotateCw size={14} />
                )}
                <span>Verificar proxy</span>
              </button>
            </div>
            {testResult.text && (
              <div className="mt-2 font-mono text-xs px-1">{testResult.text}</div>
            )}
          </FieldRow>

          {/* Row 5: Usuário do Proxy */}
          <FieldRow label="Usuário do Proxy">
            <input
              type="text"
              value={form.user}
              onChange={(e) => updateField('user', e.target.value)}
              placeholder="Nome de usuário (opcional)"
              className={inputCls}
            />
          </FieldRow>

          {/* Row 6: Senha do Proxy */}
          <FieldRow label="Senha do Proxy">
            <input
              type="text"
              value={form.pass}
              onChange={(e) => updateField('pass', e.target.value)}
              placeholder="Senha de autenticação (opcional)"
              className={inputCls}
            />
          </FieldRow>

          {/* Row 7: URL de Rotação (IP) */}
          <FieldRow label="URL de Rotação (IP)">
            <div className="relative flex items-center">
              <input
                type="text"
                value={form.rotationLink}
                onChange={(e) => updateField('rotationLink', e.target.value)}
                placeholder="Link para forçar troca de IP (opcional)"
                className={`${inputCls} pr-14`}
              />
              <div className="absolute right-3.5 flex items-center gap-2 text-slate-400 dark:text-[#7C8092]">
                <button
                  type="button"
                  title="Recarregar"
                  className="cursor-pointer text-blue-500 hover:text-blue-600 transition-transform hover:rotate-180"
                >
                  <RotateCw size={15} />
                </button>
                <Info size={15} />
              </div>
            </div>
          </FieldRow>

          {/* Row 8: Observação / Nota */}
          <FieldRow label="Observação / Nota">
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Identificação ou observação para este proxy"
              className={inputCls}
            />
          </FieldRow>
        </div>

        {/* Footer com botões maiores e confortáveis */}
        <div className="flex h-16 shrink-0 items-center justify-end gap-3.5 border-t border-slate-200 dark:border-[#292B37] bg-slate-50 dark:bg-[#16171E] px-8">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-[#9EA2AE] transition-colors hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex cursor-pointer items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-[#00FF66] dark:text-black dark:hover:bg-[#00D655] px-7 py-2.5 text-sm font-bold transition-all active:scale-[0.98] shadow-md shadow-emerald-600/20 dark:shadow-[#00FF66]/15"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarProxies;
