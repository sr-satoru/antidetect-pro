import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  ArrowLeft,
  ShieldCheck,
  Save,
  Layers,
  Link,
} from 'lucide-react';
import {
  FormularioCamposProxy,
  ProxyFormValues,
} from './formulario-campos-proxy';

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
  const [formValues, setFormValues] = useState<ProxyFormValues>({
    name: proxy?.name || '',
    type: proxy?.type || 'socks5',
    host: proxy?.host || '',
    port: proxy?.port || '',
    user: proxy?.user || '',
    pass: proxy?.pass || '',
    rotationLink: proxy?.rotationLink || '',
  });

  useEffect(() => {
    if (proxy) {
      setFormValues({
        name: proxy.name || '',
        type: proxy.type || 'socks5',
        host: proxy.host || '',
        port: proxy.port || '',
        user: proxy.user || '',
        pass: proxy.pass || '',
        rotationLink: proxy.rotationLink || '',
      });
    }
  }, [proxy]);

  const handleFieldChange = (field: keyof ProxyFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValues.host.trim() || !formValues.port.trim()) {
      alert('Por favor, informe ao menos o Host e a Porta.');
      return;
    }

    const updated = {
      ...proxy,
      name:
        formValues.name.trim() ||
        `Proxy ${formValues.host}:${formValues.port}`,
      type: formValues.type,
      host: formValues.host.trim(),
      port: formValues.port.trim(),
      user: formValues.user.trim(),
      pass: formValues.pass.trim(),
      rotationLink: formValues.rotationLink.trim(),
      ip: formValues.host.trim(),
      lastChecked: new Date().toISOString().substring(5, 19).replace('T', ' '),
    };

    onSave(updated);
    onClose();
  };

  const connectionUri = formValues.host
    ? `${formValues.type}://${
        formValues.user
          ? `${formValues.user}:${formValues.pass ? '••••••' : ''}@`
          : ''
      }${formValues.host}${formValues.port ? `:${formValues.port}` : ''}`
    : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-[#24252B] text-[#D2D5DF]">
      {/* 1. Header do Painel de Edição */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#3E404D] bg-[#1E1F26] px-6 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg p-1.5 text-xs text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
            title="Voltar para a lista"
          >
            <ArrowLeft size={16} />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="h-4 w-[1px] bg-[#3E404D]" />

          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#2F80ED]/30 bg-[#2F80ED]/10 text-[#2F80ED]">
              <Globe size={13} />
            </div>
            <span className="text-sm font-semibold text-white">
              Editar Proxy:{' '}
              <strong className="font-mono text-[#DFE104]">
                #{proxy.id < 10 ? `0${proxy.id}` : proxy.id}
              </strong>{' '}
              ({proxy.name || proxy.host})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md p-1.5 text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
          title="Fechar formulário"
        >
          <X size={17} />
        </button>
      </div>

      {/* 2. Formulário com Layout Amplo */}
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-6xl p-6">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Coluna Principal: Formulário (7 colunas) */}
            <div className="space-y-5 lg:col-span-7">
              <FormularioCamposProxy
                values={formValues}
                onChange={handleFieldChange}
              />
            </div>

            {/* Coluna Lateral: Metadados & Perfis Vinculados (5 colunas) */}
            <div className="space-y-4 lg:col-span-5">
              {/* Perfis Vinculados */}
              <div className="flex items-center justify-between rounded-xl border border-[#303342] bg-[#181920] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DFE104]/25 bg-[#DFE104]/10 text-[#DFE104]">
                    <Layers size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-white">
                      Perfis Vinculados
                    </span>
                    <span className="text-[11px] text-[#8E92A2]">
                      {proxy.usageCount || 0} navegadores utilizam este proxy
                    </span>
                  </div>
                </div>
                <span className="rounded border border-[#3E4152] bg-[#282935] px-2.5 py-1 text-xs font-bold text-white">
                  {proxy.usageCount || 0} perfis
                </span>
              </div>

              {/* Informações de Registro */}
              <div className="space-y-2 rounded-xl border border-[#303342] bg-[#181920]/60 p-4 text-xs text-[#8E92A2]">
                <div className="flex items-center gap-2 text-[12px] font-medium text-white">
                  <ShieldCheck size={14} className="text-[#2F80ED]" />
                  <span>Histórico do Registro</span>
                </div>
                <div className="space-y-1 text-[11.5px] text-[#A6ABB9]">
                  <div>
                    • Criado em:{' '}
                    <strong className="font-mono text-white">
                      {proxy.createdAt || '-'}
                    </strong>
                  </div>
                  <div>
                    • Última checagem:{' '}
                    <strong className="font-mono text-white">
                      {proxy.lastChecked || '-'}
                    </strong>
                  </div>
                  <div>
                    • Status configurado:{' '}
                    <strong
                      className={
                        proxy.status === 'active'
                          ? 'text-[#10b981]'
                          : 'text-[#ef4444]'
                      }
                    >
                      {proxy.status === 'active' ? 'Ativo' : 'Com Falha'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Resumo da Conexão */}
              <div className="space-y-2 rounded-xl border border-[#363847] bg-[#191A22] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-white uppercase select-none">
                  <Link size={14} className="text-[#DFE104]" />
                  <span>Endereço de Conexão</span>
                </div>
                <div className="rounded-lg border border-[#2E303D] bg-[#13141A] p-2.5">
                  <span className="block font-mono text-xs break-all text-[#DFE104]">
                    {connectionUri || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Footer de Ações */}
        <div className="flex h-16 shrink-0 items-center justify-start gap-3 border-t border-[#3E404D] bg-[#1E1F26] px-6 select-none">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold text-[#8E92A2] transition-colors hover:bg-[#2C2E38] hover:text-white"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#DFE104] px-5 py-2.5 text-xs font-bold text-black shadow-[0_2px_10px_rgba(223,225,4,0.15)] transition-all hover:bg-[#C5C702] active:scale-[0.98]"
          >
            <Save size={15} strokeWidth={2.2} />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditarProxies;
