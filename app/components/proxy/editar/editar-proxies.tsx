import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  X,
} from 'lucide-react';
import { api } from '@/services/index.api';
import { formatProxyTestResult, FormattedTestResult } from '@/services/proxies/service.proxies';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createPortal } from 'react-dom';

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
        type: proxy.type || proxy.proxy_type || 'socks5',
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

  // Suporte a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTesting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTesting, onClose]);

  const updateField = (field: string, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleTest = async () => {
    if (!form.host.trim() || !form.port.trim() || isTesting) return;

    setIsTesting(true);
    setTestResult({ status: 'idle', text: 'Testando conexão...' });

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
        text: 'Erro ao testar conexão com o proxy',
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
      ip: testResult.exitIp || form.host.trim().replace(/^\[|\]$/g, ''),
      ping: testResult.latencyMs ?? proxy.ping,
      lastChecked: new Date().toISOString().substring(5, 19).replace('T', ' '),
    };

    onSave(updated);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[8vh] sm:pt-[10vh] p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isTesting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-[620px] rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 mb-12 select-none"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#2D3039] px-6 py-4 bg-[#F8F7F5] dark:bg-[#1F2026]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/20">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Editar Configurações de Proxy
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-[#9DA2B4]">
                Atualize o protocolo, host, porta e credenciais de acesso
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:text-[#9DA2B4] dark:hover:bg-[#282A33] dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6 select-text">
          {/* Linha 1: ID e Tipo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Identificador ID</Label>
              <div className="flex h-9 items-center">
                <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                  #{proxy?.id ?? '01'}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Tipo de Protocolo *</Label>
              <Select
                value={form.type}
                onValueChange={(val) => updateField('type', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o protocolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="socks5">SOCKS5</SelectItem>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="mobile">Móvel 4G/5G</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Nome / Rótulo */}
          <div>
            <Label htmlFor="edit-proxy-name" className="mb-1.5 block">
              Nome do Proxy
            </Label>
            <Input
              id="edit-proxy-name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ex: Residencial SP 01"
            />
          </div>

          {/* Linha 3: Host e Porta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <Label htmlFor="edit-proxy-host" className="mb-1.5 block">
                Host / IP *
              </Label>
              <Input
                id="edit-proxy-host"
                type="text"
                required
                value={form.host}
                onChange={(e) => updateField('host', e.target.value)}
                placeholder="192.168.1.1 ou proxy.exemplo.com"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="edit-proxy-port" className="mb-1.5 block">
                Porta *
              </Label>
              <Input
                id="edit-proxy-port"
                type="text"
                required
                value={form.port}
                onChange={(e) =>
                  updateField('port', e.target.value.replace(/\D/g, ''))
                }
                placeholder="1080"
                className="font-mono text-center"
              />
            </div>
          </div>

          {/* Linha 4: Usuário e Senha */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-proxy-user" className="mb-1.5 block">
                Usuário (Opcional)
              </Label>
              <Input
                id="edit-proxy-user"
                type="text"
                value={form.user}
                onChange={(e) => updateField('user', e.target.value)}
                placeholder="usuario"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="edit-proxy-pass" className="mb-1.5 block">
                Senha (Opcional)
              </Label>
              <Input
                id="edit-proxy-pass"
                type="text"
                value={form.pass}
                onChange={(e) => updateField('pass', e.target.value)}
                placeholder="senha"
                className="font-mono"
              />
            </div>
          </div>

          {/* Linha 5: Link de Rotação (para móvel ou opcional) */}
          <div>
            <Label htmlFor="edit-rotation" className="mb-1.5 block">
              URL de Troca de IP / Rotação{' '}
              <span className="text-[11px] font-normal text-slate-400 dark:text-[#787D90]">
                (Opcional)
              </span>
            </Label>
            <Input
              id="edit-rotation"
              type="url"
              value={form.rotationLink}
              onChange={(e) => updateField('rotationLink', e.target.value)}
              placeholder="https://api.proxymobile.net/change-ip?token=..."
              className="font-mono text-emerald-600 dark:text-[#00FF66]"
            />
          </div>

          {/* Test connection row */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting || !form.host.trim() || !form.port.trim()}
              className="h-9 gap-1.5 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 text-xs font-medium text-slate-700 dark:text-[#E2E4EC] hover:bg-slate-50 dark:hover:bg-[#282A33]"
            >
              {isTesting ? (
                <Loader2 size={14} className="animate-spin text-[#7C3AED] dark:text-[#A78BFA]" />
              ) : (
                <RotateCw size={14} />
              )}
              <span>Verificar Conexão</span>
            </Button>

            {testResult.text && (
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {testResult.status === 'active' ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 size={14} />
                    <span>{testResult.text}</span>
                  </span>
                ) : testResult.status === 'error' ? (
                  <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                    <XCircle size={14} />
                    <span>{testResult.text}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-[#9DA2B4]">
                    {testResult.text}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex h-16 shrink-0 items-center justify-end gap-3 border-t border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] px-6 select-none">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-4 text-xs font-medium text-slate-700 dark:text-[#E2E4EC] hover:bg-slate-50 dark:hover:bg-[#282A33]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!form.host.trim() || !form.port.trim()}
            className="h-9 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 text-xs font-semibold shadow-xs"
          >
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditarProxies;
